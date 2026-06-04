import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginAuditStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const REFRESH_TOKEN_LIFETIME_DAYS = 30;
const PASSWORD_RESET_LIFETIME_MINUTES = 30;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 15;

type AuthRequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name,
        password: await hash(dto.password, 12),
      },
    });

    return this.createSession(user.id);
  }

  async login(dto: LoginDto, meta: AuthRequestMeta = {}) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.deletedAt) {
      await this.recordLoginAudit({
        email,
        status: LoginAuditStatus.FAILED,
        reason: 'invalid_credentials',
        ...meta,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordLoginAudit({
        email,
        userId: user.id,
        status: LoginAuditStatus.LOCKED,
        reason: 'account_locked',
        ...meta,
      });
      throw new UnauthorizedException('Account is temporarily locked');
    }

    const passwordMatches = await compare(dto.password, user.password);

    if (!passwordMatches) {
      await this.trackFailedLogin(user.id);
      await this.recordLoginAudit({
        email,
        userId: user.id,
        status: LoginAuditStatus.FAILED,
        reason: 'invalid_credentials',
        ...meta,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });
    await this.recordLoginAudit({
      email,
      userId: user.id,
      status: LoginAuditStatus.SUCCESS,
      ...meta,
    });

    return this.createSession(user.id);
  }

  async refresh(refreshToken: string) {
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(refreshToken) },
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date(), revokedReason: 'rotated' },
    });

    return this.createSession(storedToken.userId);
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });

    return { success: true };
  }

  async requestPasswordReset(dto: { email: string }) {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || user.deletedAt) {
      return {
        message:
          'Jika email terdaftar, instruksi reset password akan dikirim.',
      };
    }

    const resetToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + PASSWORD_RESET_LIFETIME_MINUTES);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(resetToken),
        expiresAt,
      },
    });

    return {
      message: 'Token reset password berhasil dibuat.',
      resetToken,
      expiresAt,
    };
  }

  async resetPassword(dto: { token: string; newPassword: string }) {
    const tokenHash = this.hashToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Invalid password reset token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: await hash(dto.newPassword, 12),
          failedLoginCount: 0,
          lockedUntil: null,
          passwordChangedAt: new Date(),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'password_reset' },
      }),
    ]);

    return { message: 'Password berhasil direset. Semua sesi aktif dicabut.' };
  }

  async revokeCurrentSession(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          tokenHash: this.hashToken(refreshToken),
          revokedAt: null,
        },
        data: { revokedAt: new Date(), revokedReason: 'manual_revoke' },
      });

      return { message: 'Sesi berhasil dicabut.' };
    }

    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'manual_revoke_all' },
    });

    return { message: 'Semua sesi aktif berhasil dicabut.' };
  }

  async getSessions(userId: string) {
    return {
      data: await this.prisma.refreshToken.findMany({
        where: { userId },
        select: {
          id: true,
          expiresAt: true,
          revokedAt: true,
          revokedReason: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    };
  }

  async getLoginAudit(userId: string) {
    return {
      data: await this.prisma.loginAudit.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    };
  }

  private async createSession(userId: string) {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });
    const permissions = [
      ...new Set(
        user.roles.flatMap(({ role }) =>
          role.permissions.map(({ permission }) => permission.key),
        ),
      ),
    ];
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_LIFETIME_DAYS);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });

    return {
      accessToken: await this.jwtService.signAsync({
        id: user.id,
        email: user.email,
        permissions,
      }),
      refreshToken,
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async trackFailedLogin(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const failedLoginCount = user.failedLoginCount + 1;
    const lockedUntil = new Date();
    lockedUntil.setMinutes(lockedUntil.getMinutes() + ACCOUNT_LOCK_MINUTES);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginCount,
        lockedUntil:
          failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS ? lockedUntil : null,
      },
    });
  }

  private async recordLoginAudit({
    email,
    ipAddress,
    reason,
    status,
    userAgent,
    userId,
  }: AuthRequestMeta & {
    email: string;
    reason?: string;
    status: LoginAuditStatus;
    userId?: string;
  }) {
    await this.prisma.loginAudit.create({
      data: {
        email,
        ipAddress,
        reason,
        status,
        userAgent,
        userId,
      },
    });
  }
}
