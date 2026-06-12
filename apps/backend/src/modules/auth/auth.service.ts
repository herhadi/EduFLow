import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginAuditStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const LOGIN_SESSION_LIFETIME_HOURS = 24;
const PASSWORD_RESET_LIFETIME_MINUTES = 30;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 15;

type AuthRequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

type RequestPasswordResetInput = {
  email: string;
};

type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

type LoginAuditInput = AuthRequestMeta & {
  email: string;
  reason?: string;
  status: LoginAuditStatus;
  userId?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const username = dto.username?.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        name: dto.name,
        password: await hash(dto.password, 12),
      },
    });

    return this.createSession(user.id);
  }

  async login(dto: LoginDto, meta: AuthRequestMeta = {}) {
    const identifier = dto.username.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });

    if (!user || user.deletedAt) {
      await this.recordLoginAudit({
        email: identifier,
        status: LoginAuditStatus.FAILED,
        reason: 'invalid_credentials',
        ...meta,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordLoginAudit({
        email: user.email,
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
        email: user.email,
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
      email: user.email,
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

  async requestPasswordReset(dto: RequestPasswordResetInput) {
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
    expiresAt.setMinutes(
      expiresAt.getMinutes() + PASSWORD_RESET_LIFETIME_MINUTES,
    );

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

  async resetPassword(dto: ResetPasswordInput) {
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

    const hashedPassword = await hash(dto.newPassword, 12);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          failedLoginCount: 0,
          lockedUntil: null,
          passwordChangedAt: now,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: resetToken.userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'password_reset' },
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

  async getUsers() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        lastLoginAt: true,
        lockedUntil: true,
        createdAt: true,
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: users.map((user) => ({
        ...user,
        roles: user.roles.map(({ role }) => role.name),
      })),
    };
  }

  async createUser(dto: CreateUserDto) {
    const username = dto.username.trim().toLowerCase();
    const email = dto.email?.trim().toLowerCase() || `${username}@eduflow.local`;
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      throw new ConflictException('Username atau email sudah digunakan');
    }

    const roles = await this.getRolesByNames(dto.roles ?? []);
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        name: dto.name,
        password: await hash(dto.password, 12),
        roles: {
          create: roles.map((role) => ({
            roleId: role.id,
          })),
        },
      },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        roles: { include: { role: true } },
      },
    });

    return {
      data: {
        ...user,
        roles: user.roles.map(({ role }) => role.name),
      },
      message: 'User berhasil dibuat.',
    };
  }

  async updateUserRoles(userId: string, roleNames: string[]) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const roles = await this.getRolesByNames(roleNames);

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId } }),
      ...roles.map((role) =>
        this.prisma.userRole.create({
          data: {
            userId,
            roleId: role.id,
          },
        }),
      ),
    ]);

    return {
      data: { userId, roles: roles.map((role) => role.name) },
      message: 'Role user berhasil diperbarui.',
    };
  }

  async deactivateUser(userId: string, actorUserId: string) {
    if (userId === actorUserId) {
      throw new BadRequestException('Tidak bisa menonaktifkan akun sendiri');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    await this.ensureRootSafety(userId, user.roles.map(({ role }) => role.name));

    const now = new Date();
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'user_deactivated' },
      });
      await tx.userRole.deleteMany({ where: { userId } });

      return tx.user.update({
        where: { id: userId },
        data: { deletedAt: now, lockedUntil: now },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          deletedAt: true,
        },
      });
    });

    return { data: result, message: 'User berhasil dinonaktifkan.' };
  }

  async deleteUser(userId: string, actorUserId: string) {
    if (userId === actorUserId) {
      throw new BadRequestException('Tidak bisa menghapus akun sendiri');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    await this.ensureRootSafety(userId, user.roles.map(({ role }) => role.name));

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.teacher.updateMany({
          where: { userId },
          data: { userId: null },
        });
        await tx.userRole.deleteMany({ where: { userId } });
        await tx.refreshToken.deleteMany({ where: { userId } });
        await tx.passwordResetToken.deleteMany({ where: { userId } });
        await tx.loginAudit.deleteMany({ where: { userId } });

        return tx.user.delete({
          where: { id: userId },
          select: { id: true, email: true, username: true, name: true },
        });
      });

      return { data: result, message: 'User berhasil dihapus permanen.' };
    } catch {
      throw new BadRequestException(
        'User tidak bisa dihapus permanen karena sudah dipakai histori operasional. Gunakan Nonaktifkan.',
      );
    }
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
    const roles = [...new Set(user.roles.map(({ role }) => role.name))];
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + LOGIN_SESSION_LIFETIME_HOURS);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
      },
    });
    const accessToken = await this.jwtService.signAsync(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        roles,
        permissions,
      },
      { expiresIn: `${LOGIN_SESSION_LIFETIME_HOURS}h` },
    );

    return {
      accessToken,
      refreshToken,
      expiresAt,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        roles,
        permissions,
      },
    };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async ensureRootSafety(userId: string, targetRoleNames: string[]) {
    if (!targetRoleNames.includes('root')) {
      return;
    }

    const activeRootCount = await this.prisma.user.count({
      where: {
        deletedAt: null,
        id: { not: userId },
        roles: { some: { role: { name: 'root' } } },
      },
    });

    if (activeRootCount < 1) {
      throw new BadRequestException('Minimal harus ada satu root aktif');
    }
  }

  private async getRolesByNames(roleNames: string[]) {
    const normalizedRoleNames = [...new Set(roleNames.map((role) => role.trim()))]
      .filter(Boolean);

    if (!normalizedRoleNames.length) {
      return [];
    }

    const roles = await this.prisma.role.findMany({
      where: { name: { in: normalizedRoleNames } },
    });

    if (roles.length !== normalizedRoleNames.length) {
      throw new ConflictException('Ada role yang tidak terdaftar');
    }

    return roles;
  }

  private async trackFailedLogin(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
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

  private async recordLoginAudit(input: LoginAuditInput) {
    await this.prisma.loginAudit.create({
      data: {
        email: input.email,
        ipAddress: input.ipAddress ?? null,
        reason: input.reason ?? null,
        status: input.status,
        userAgent: input.userAgent ?? null,
        userId: input.userId ?? null,
      },
    });
  }
}
