import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AssessmentStatus, LoginAuditStatus, TeachingPlanStatus } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { STORAGE_PROVIDER, StorageProvider } from '../../infrastructure/storage/storage-provider';
import { TelegramBotService } from '../../infrastructure/telegram/telegram-bot.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { ReportingService } from '../reporting/reporting.service';
import { ConfirmTelegramLinkDto } from './dto/confirm-telegram-link.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

const LOGIN_SESSION_LIFETIME_HOURS = 24;
const PASSWORD_RESET_LIFETIME_MINUTES = 30;
const TELEGRAM_LINK_LIFETIME_MINUTES = 15;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const ACCOUNT_LOCK_MINUTES = 15;
const TELEGRAM_MONITORING_ROLES = ['kepala_sekolah', 'root', 'operator_sekolah'];

type AuthRequestMeta = {
  ipAddress?: string;
  userAgent?: string;
};

type RequestPasswordResetInput = {
  username: string;
};

type ResetPasswordInput = {
  token: string;
  newPassword: string;
};

type ChangeInitialPasswordInput = {
  newPassword: string;
  repeatPassword: string;
};

type ChangePasswordInput = ChangeInitialPasswordInput & {
  currentPassword: string;
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
    private readonly configService: ConfigService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly notificationService: NotificationService,
    private readonly telegramBotService: TelegramBotService,
    private readonly reportingService: ReportingService,
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

    return this.createSession(user.id, meta);
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

    return this.createSession(storedToken.userId, {
      ipAddress: storedToken.ipAddress ?? undefined,
      userAgent: storedToken.userAgent ?? undefined,
    });
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: 'logout' },
    });

    return { success: true };
  }

  async changeInitialPassword(
    userId: string,
    input: ChangeInitialPasswordInput,
  ) {
    if (input.newPassword !== input.repeatPassword) {
      throw new BadRequestException('Konfirmasi password tidak sama');
    }

    if (input.newPassword === this.getDefaultUserPassword()) {
      throw new BadRequestException('Password baru tidak boleh sama dengan password default');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const stillUsesDefaultPassword = await this.isDefaultPassword(user.password);

    if (!stillUsesDefaultPassword) {
      return {
        data: await this.getSessionUser(userId),
        message: 'Password sudah pernah diganti.',
      };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hash(input.newPassword, 12),
        passwordChangedAt: new Date(),
      },
    });

    return {
      data: await this.getSessionUser(userId),
      message: 'Password berhasil diganti.',
    };
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    if (input.newPassword !== input.repeatPassword) {
      throw new BadRequestException('Konfirmasi password tidak sama');
    }

    if (input.newPassword === input.currentPassword) {
      throw new BadRequestException('Password baru tidak boleh sama dengan password lama');
    }

    if (input.newPassword === this.getDefaultUserPassword()) {
      throw new BadRequestException('Password baru tidak boleh sama dengan password default');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const passwordMatches = await compare(input.currentPassword, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Password lama tidak sesuai');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          password: await hash(input.newPassword, 12),
          passwordChangedAt: new Date(),
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'password_changed' },
      }),
    ]);

    return { message: 'Password berhasil diganti. Silakan login ulang.' };
  }

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
      include: { roles: { include: { role: true } }, teacherProfile: true },
    });

    return { data: await this.toProfileUser(user) };
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    const name = dto.name?.trim();
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name: name || undefined }),
      },
      include: { roles: { include: { role: true } }, teacherProfile: true },
    });

    return { data: await this.toProfileUser(user), message: 'Profil berhasil diperbarui.' };
  }

  async uploadMyProfilePhoto(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { roles: { include: { role: true } }, teacherProfile: true },
    });

    if (!user) throw new NotFoundException('User tidak ditemukan');

    const key = `users/${userId}/profile/${randomUUID()}${extname(file.originalname).toLowerCase()}`;
    const stored = await this.storage.upload({
      buffer: file.buffer,
      key,
      name: file.originalname,
      mimeType: file.mimetype,
    });
    const photoData = {
      photoKey: stored.key,
      photoName: stored.name,
      photoMimeType: stored.mimeType,
      photoSize: stored.size,
    };
    const syncedUser = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: photoData,
      });

      if (user.teacherProfile) {
        await tx.teacher.update({
          where: { id: user.teacherProfile.id },
          data: { photoUrl: null, ...photoData },
        });
      }

      return tx.user.findFirstOrThrow({
        where: { id: userId, deletedAt: null },
        include: { roles: { include: { role: true } }, teacherProfile: true },
      });
    });

    const obsoleteKeys = new Set(
      [user.photoKey, user.teacherProfile?.photoKey].filter(
        (photoKey): photoKey is string => Boolean(photoKey) && photoKey !== stored.key,
      ),
    );
    await Promise.all([...obsoleteKeys].map((photoKey) => this.storage.delete(photoKey).catch(() => undefined)));

    return { data: await this.toProfileUser(syncedUser), message: 'Foto profil berhasil diunggah.' };
  }

  async createTelegramLinkToken(userId: string) {
    await this.prisma.user.findFirstOrThrow({ where: { id: userId, deletedAt: null } });

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + TELEGRAM_LINK_LIFETIME_MINUTES);

    await this.prisma.telegramLinkToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt,
      },
    });

    return {
      data: {
        token,
        botUrl: this.getTelegramBotUrl(token),
        expiresAt,
      },
      message: 'Token aktivasi Telegram dibuat.',
    };
  }

  async confirmTelegramLink(dto: ConfirmTelegramLinkDto) {
    const linkToken = await this.prisma.telegramLinkToken.findUnique({
      where: { tokenHash: this.hashToken(dto.token) },
    });

    if (!linkToken || linkToken.usedAt || linkToken.expiresAt <= new Date()) {
      throw new BadRequestException('Token aktivasi Telegram tidak valid atau kedaluwarsa');
    }

    const telegramId = dto.telegramId.trim();
    if (!telegramId) throw new BadRequestException('Telegram ID wajib diisi');

    const now = new Date();
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.telegramLinkToken.update({
        where: { id: linkToken.id },
        data: { usedAt: now },
      });

      return tx.user.update({
        where: { id: linkToken.userId },
        data: { telegramId, telegramLinkedAt: now },
        include: { roles: { include: { role: true } }, teacherProfile: true },
      });
    });

    return { data: await this.toProfileUser(user), message: 'Telegram berhasil diaktifkan.' };
  }

  async handleTelegramWebhook(update: unknown, secretToken?: string | string[]) {
    if (!this.telegramBotService.verifyWebhookSecret(secretToken)) {
      throw new UnauthorizedException('Telegram webhook secret tidak valid');
    }

    const message = this.getTelegramMessage(update);

    if (!message) {
      return { ok: true, ignored: true };
    }

    if (this.isTelegramCommand(message.text, '/help')) {
      const linkedUser = await this.getTelegramLinkedUser(message);
      await this.telegramBotService.sendMessage(
        String(message.chatId),
        this.getTelegramHelpMessage(linkedUser?.roles ?? []),
      ).catch(() => undefined);
      return { ok: true };
    }

    if (
      this.isTelegramCommand(message.text, '/kbm') ||
      this.isTelegramCommand(message.text, '/today') ||
      this.isTelegramCommand(message.text, '/review')
    ) {
      await this.handleTelegramMonitoringCommand(message);
      return { ok: true };
    }

    const token = this.extractTelegramStartToken(message.text);

    if (!token) {
      await this.telegramBotService.sendMessage(
        String(message.chatId),
        'Halo. Bot EduFlow aktif.\n\nKetik /help untuk melihat panduan. Untuk menghubungkan akun, buka EduFlow lalu klik Aktivasi Telegram dari beranda atau Profil.',
      ).catch(() => undefined);
      return { ok: true, ignored: true };
    }

    try {
      const confirmation = await this.confirmTelegramLink({
        telegramId: String(message.fromId ?? message.chatId),
        token,
      });
      await this.telegramBotService.sendMessage(
        String(message.chatId),
        `Halo, ${this.escapeTelegramHtml(confirmation.data.name)}.\n\nTelegram berhasil terhubung dengan akun EduFlow Anda. Mulai sekarang reminder dan notifikasi sekolah akan dikirim ke sini.`,
      ).catch(() => undefined);
    } catch (error) {
      await this.telegramBotService.sendMessage(
        String(message.chatId),
        error instanceof Error
          ? `Aktivasi Telegram gagal: ${error.message}`
          : 'Aktivasi Telegram gagal.',
      ).catch(() => undefined);
    }

    return { ok: true };
  }

  async requestPasswordReset(dto: RequestPasswordResetInput) {
    const username = dto.username.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { username },
          { email: username },
        ],
      },
      include: { roles: { include: { role: true } } },
    });

    if (!user || user.deletedAt) {
      return {
        message:
          'Jika username valid, request reset password akan diteruskan ke admin sekolah.',
      };
    }

    await this.notificationService.createPasswordResetRequestInbox({
      userId: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      roles: user.roles.map(({ role }) => role.name),
    });

    return {
      message:
        'Jika username valid, request reset password akan diteruskan ke admin sekolah.',
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
          tokenHash: true,
          expiresAt: true,
          ipAddress: true,
          userAgent: true,
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
    const password = dto.password ?? this.getDefaultUserPassword();
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
        password: await hash(password, 12),
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

  async resetUserPassword(userId: string, actorUserId: string) {
    if (userId === actorUserId) {
      throw new BadRequestException('Gunakan halaman Profil untuk mengganti password akun sendiri');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    const now = new Date();
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'admin-password-reset' },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: now },
      });

      return tx.user.update({
        where: { id: userId },
        data: {
          password: await hash(this.getDefaultUserPassword(), 12),
          passwordChangedAt: null,
          failedLoginCount: 0,
          lockedUntil: null,
        },
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
      });
    });

    return {
      data: {
        ...updatedUser,
        roles: updatedUser.roles.map(({ role }) => role.name),
      },
      message:
        'Password user direset ke password default. User wajib mengganti password saat login berikutnya.',
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

  private async createSession(userId: string, meta: AuthRequestMeta = {}) {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
      include: {
        teacherProfile: true,
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
    const profileUser = await this.toProfileUser(user);
    const refreshToken = randomBytes(48).toString('base64url');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + LOGIN_SESSION_LIFETIME_HOURS);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
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

    const mustChangePassword = await this.isDefaultPassword(user.password);

    return {
      accessToken,
      refreshToken,
      expiresAt,
      user: {
        ...profileUser,
        roles,
        permissions,
        mustChangePassword,
      },
    };
  }

  private async getSessionUser(userId: string) {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, deletedAt: null },
      include: {
        teacherProfile: true,
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
    const profileUser = await this.toProfileUser(user);

    return {
      ...profileUser,
      roles,
      permissions,
      mustChangePassword: await this.isDefaultPassword(user.password),
    };
  }

  private async toProfileUser(user: {
    id: string;
    email: string;
    username: string | null;
    name: string;
    photoKey?: string | null;
    photoName?: string | null;
    telegramId?: string | null;
    telegramLinkedAt?: Date | null;
    roles: Array<{ role: { name: string } }>;
  }) {
    const photoKey = user.photoKey;
    const photoName = user.photoName ?? 'foto-profil';

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      roles: [...new Set(user.roles.map(({ role }) => role.name))],
      photoUrl: photoKey ? await this.storage.createDownloadUrl(photoKey, photoName) : null,
      telegramId: user.telegramId ?? null,
      telegramLinkedAt: user.telegramLinkedAt ?? null,
    };
  }

  private getTelegramBotUrl(token: string) {
    const configuredUrl = this.configService.get<string>('TELEGRAM_BOT_URL');
    const botUsername = this.configService.get<string>('TELEGRAM_BOT_USERNAME');

    if (configuredUrl) {
      const separator = configuredUrl.includes('?') ? '&' : '?';
      return `${configuredUrl}${separator}start=${encodeURIComponent(token)}`;
    }

    if (botUsername) {
      return `https://t.me/${botUsername.replace(/^@/, '')}?start=${encodeURIComponent(token)}`;
    }

    return null;
  }

  private getTelegramMessage(update: unknown) {
    if (!update || typeof update !== 'object') {
      return null;
    }

    const message = (update as { message?: unknown }).message;

    if (!message || typeof message !== 'object') {
      return null;
    }

    const text = (message as { text?: unknown }).text;
    const chat = (message as { chat?: { id?: unknown } }).chat;
    const from = (message as { from?: { id?: unknown } }).from;

    if (typeof text !== 'string' || (typeof chat?.id !== 'string' && typeof chat?.id !== 'number')) {
      return null;
    }

    return {
      chatId: chat.id,
      fromId: from?.id,
      text,
    };
  }

  private extractTelegramStartToken(text: string) {
    const [command, token] = text.trim().split(/\s+/, 2);
    const commandName = command.split('@')[0];

    if (commandName !== '/start' || !token) {
      return null;
    }

    return token;
  }

  private isTelegramCommand(text: string, expectedCommand: string) {
    const [command] = text.trim().split(/\s+/, 1);
    return command.split('@')[0] === expectedCommand;
  }

  private async handleTelegramMonitoringCommand(message: { chatId: string | number; fromId?: unknown; text: string }) {
    const linkedUser = await this.getTelegramLinkedUser(message);

    if (!linkedUser) {
      await this.telegramBotService.sendMessage(
        String(message.chatId),
        'Telegram belum terhubung ke akun EduFlow. Login ke EduFlow lalu klik Aktivasi Telegram dari beranda atau Profil.',
      ).catch(() => undefined);
      return;
    }

    if (!this.canUseTelegramMonitoring(linkedUser.roles)) {
      await this.telegramBotService.sendMessage(
        String(message.chatId),
        'Command ini hanya untuk Kepala Sekolah, root, atau operator sekolah.',
      ).catch(() => undefined);
      return;
    }

    const response = this.isTelegramCommand(message.text, '/review')
      ? await this.getTelegramReviewMessage()
      : await this.getTelegramKbmMessage();

    await this.telegramBotService.sendMessage(String(message.chatId), response).catch(() => undefined);
  }

  private async getTelegramLinkedUser(message: { chatId: string | number; fromId?: unknown }) {
    const telegramId = String(message.fromId ?? message.chatId);
    const user = await this.prisma.user.findFirst({
      where: { deletedAt: null, telegramId },
      select: {
        id: true,
        name: true,
        roles: { include: { role: true } },
      },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      roles: user.roles.map(({ role }) => role.name),
    };
  }

  private canUseTelegramMonitoring(roles: string[]) {
    return roles.some((role) => TELEGRAM_MONITORING_ROLES.includes(role));
  }

  private async getTelegramKbmMessage() {
    const { data } = await this.reportingService.getOperationalToday();
    const followUpItems = data.kbm.followUpItems.slice(0, 5);
    const substituteItems = data.kbm.substitutes.items.slice(0, 3);
    const lines = [
      `<b>Ringkasan KBM ${this.escapeTelegramHtml(data.date)}</b>`,
      '',
      `Agenda: ${data.classes.totalToday}`,
      `Berjalan: ${data.classes.inProgress}`,
      `Selesai: ${data.classes.completed}`,
      `Belum submit: ${data.classes.notSubmitted}`,
      `Kelas kosong: ${data.classes.empty}`,
      '',
      `Guru mengajar: ${data.teachers.totalTeaching}`,
      `Guru sudah submit: ${data.teachers.submitted}`,
      `Guru belum submit: ${data.teachers.notSubmitted}`,
      '',
      `Checklist kurang: ${data.kbm.checklist.missing}`,
      `Catatan kendala: ${data.kbm.checklist.withIssueNotes}`,
      `Guru pengganti: ${data.kbm.substitutes.total}`,
    ];

    if (substituteItems.length) {
      lines.push('', '<b>Guru pengganti</b>');
      lines.push(...substituteItems.map((item) =>
        `- ${this.escapeTelegramHtml(item.className)} ${this.escapeTelegramHtml(item.subjectName)}: ${this.escapeTelegramHtml(item.substituteTeacherName ?? '-')}`,
      ));
    }

    if (followUpItems.length) {
      lines.push('', '<b>Perlu perhatian</b>');
      lines.push(...followUpItems.map((item) =>
        `- ${this.escapeTelegramHtml(item.startsAt ?? '-')}: ${this.escapeTelegramHtml(item.className)} ${this.escapeTelegramHtml(item.subjectName)} (${this.escapeTelegramHtml(item.status)})`,
      ));
    }

    lines.push('', 'Command ini hanya membalas saat diminta, tidak broadcast otomatis.');
    return lines.join('\n');
  }

  private async getTelegramReviewMessage() {
    const [teachingPlanItems, assessmentItems, teachingPlanCount, assessmentCount] = await Promise.all([
      this.prisma.teachingPlan.findMany({
        where: { status: TeachingPlanStatus.SUBMITTED, deletedAt: null },
        include: { teacher: true, subject: true },
        orderBy: { submittedAt: 'asc' },
        take: 5,
      }),
      this.prisma.assessment.findMany({
        where: { status: AssessmentStatus.SUBMITTED, deletedAt: null },
        include: { teacher: true, class: true, subject: true },
        orderBy: { submittedAt: 'asc' },
        take: 5,
      }),
      this.prisma.teachingPlan.count({
        where: { status: TeachingPlanStatus.SUBMITTED, deletedAt: null },
      }),
      this.prisma.assessment.count({
        where: { status: AssessmentStatus.SUBMITTED, deletedAt: null },
      }),
    ]);
    const lines = [
      '<b>Antrean Review KS</b>',
      '',
      `Perangkat ajar: ${teachingPlanCount}`,
      `Nilai harian: ${assessmentCount}`,
    ];

    if (teachingPlanItems.length) {
      lines.push('', '<b>Perangkat ajar teratas</b>');
      lines.push(...teachingPlanItems.map((item) =>
        `- ${this.escapeTelegramHtml(item.teacher.name)}: ${this.escapeTelegramHtml(item.title)} (${this.escapeTelegramHtml(item.subject.name)})`,
      ));
    }

    if (assessmentItems.length) {
      lines.push('', '<b>Nilai teratas</b>');
      lines.push(...assessmentItems.map((item) =>
        `- ${this.escapeTelegramHtml(item.teacher.name)}: ${this.escapeTelegramHtml(item.class.name)} ${this.escapeTelegramHtml(item.subject.name)} - ${this.escapeTelegramHtml(item.title)}`,
      ));
    }

    const reviewUrl = this.getFrontendUrl('/principal/review');
    if (reviewUrl) {
      lines.push('', `Buka review: ${this.escapeTelegramHtml(reviewUrl)}`);
    }

    lines.push('', 'Command ini on-demand agar tidak spam.');
    return lines.join('\n');
  }

  private getFrontendUrl(path: string) {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.trim();

    if (!frontendUrl) {
      return null;
    }

    return `${frontendUrl.replace(/\/$/, '')}${path}`;
  }

  private getTelegramHelpMessage(roles: string[] = []) {
    const lines = [
      '<b>EduFlow Bot</b>',
      '',
      'Perintah yang tersedia:',
      '/help - Menampilkan panduan bot.',
      '/start - Mengecek status bot.',
    ];

    if (this.canUseTelegramMonitoring(roles)) {
      lines.push(
        '/kbm - Ringkasan KBM hari ini untuk KS/operator.',
        '/today - Alias ringkasan KBM hari ini.',
        '/review - Antrean review perangkat ajar dan nilai.',
      );
    }

    lines.push(
      '',
      'Untuk aktivasi akun:',
      '1. Login ke EduFlow.',
      '2. Klik Aktivasi Telegram di beranda atau Profil.',
      '3. Tekan Start pada bot yang terbuka.',
      '',
      'Setelah terhubung, reminder dan notifikasi sekolah akan dikirim ke chat ini.',
    );

    return lines.join('\n');
  }

  private escapeTelegramHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  private async isDefaultPassword(passwordHash: string) {
    return compare(this.getDefaultUserPassword(), passwordHash);
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

  private getDefaultUserPassword() {
    return this.configService.get<string>('DEFAULT_USER_PASSWORD') ?? '123456';
  }
}
