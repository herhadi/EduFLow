import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestWithUser } from '../../core/http/request-with-user';
import { AuthService } from './auth.service';
import { ChangeInitialPasswordDto } from './dto/change-initial-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ConfirmTelegramLinkDto } from './dto/confirm-telegram-link.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RevokeSessionDto } from './dto/revoke-session.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: RequestWithUser) {
    return this.authService.login(dto, {
      ipAddress: this.getIpAddress(request),
      userAgent: request.headers['user-agent'],
    });
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Post('change-initial-password')
  changeInitialPassword(
    @Body() dto: ChangeInitialPasswordDto,
    @Req() request: RequestWithUser,
  ) {
    return this.authService.changeInitialPassword(request.user.id, dto);
  }

  @Post('change-password')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() request: RequestWithUser,
  ) {
    return this.authService.changePassword(request.user.id, dto);
  }

  @Public()
  @Post('password-reset/request')
  requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    return this.authService.requestPasswordReset(dto);
  }

  @Public()
  @Post('password-reset/confirm')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('sessions')
  getSessions(@Req() request: RequestWithUser) {
    return this.authService.getSessions(request.user.id);
  }

  @Post('sessions/revoke')
  revokeSession(
    @Body() dto: RevokeSessionDto,
    @Req() request: RequestWithUser,
  ) {
    return this.authService.revokeCurrentSession(
      request.user.id,
      dto.refreshToken,
    );
  }

  @Get('login-audit')
  getLoginAudit(@Req() request: RequestWithUser) {
    return this.authService.getLoginAudit(request.user.id);
  }

  @Get('me')
  me(@Req() request: RequestWithUser) {
    return request.user;
  }

  @Get('me/profile')
  getMyProfile(@Req() request: RequestWithUser) {
    return this.authService.getMyProfile(request.user.id);
  }

  @Patch('me/profile')
  updateMyProfile(
    @Body() dto: UpdateMyProfileDto,
    @Req() request: RequestWithUser,
  ) {
    return this.authService.updateMyProfile(request.user.id, dto);
  }

  @Post('me/profile/photo')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
      const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
      callback(supported ? null : new BadRequestException('Foto profil harus JPEG, PNG, atau WebP'), supported);
    },
  }))
  uploadMyProfilePhoto(
    @Req() request: RequestWithUser,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!file) throw new BadRequestException('Foto profil wajib dipilih');
    return this.authService.uploadMyProfilePhoto(request.user.id, file);
  }

  @Post('me/telegram/link-token')
  createTelegramLinkToken(@Req() request: RequestWithUser) {
    return this.authService.createTelegramLinkToken(request.user.id);
  }

  @Public()
  @Post('telegram/link/confirm')
  confirmTelegramLink(@Body() dto: ConfirmTelegramLinkDto) {
    return this.authService.confirmTelegramLink(dto);
  }

  @Public()
  @Post('telegram/webhook')
  handleTelegramWebhook(
    @Body() update: unknown,
    @Headers('x-telegram-bot-api-secret-token') secretToken?: string,
  ) {
    return this.authService.handleTelegramWebhook(update, secretToken);
  }

  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Get('users')
  getUsers() {
    return this.authService.getUsers();
  }

  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.authService.createUser(dto);
  }

  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Post('users/:id/roles')
  updateUserRoles(
    @Param('id') id: string,
    @Body() dto: UpdateUserRolesDto,
  ) {
    return this.authService.updateUserRoles(id, dto.roles);
  }

  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Post('users/:id/reset-password')
  resetUserPassword(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.authService.resetUserPassword(id, request.user.id);
  }

  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Patch('users/:id/deactivate')
  deactivateUser(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.authService.deactivateUser(id, request.user.id);
  }

  @RequirePermissions(PERMISSIONS.USER_MANAGE)
  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @Req() request: RequestWithUser) {
    return this.authService.deleteUser(id, request.user.id);
  }

  private getIpAddress(request: RequestWithUser) {
    const forwardedFor = request.headers['x-forwarded-for'];

    if (Array.isArray(forwardedFor)) {
      return forwardedFor[0];
    }

    return forwardedFor?.split(',')[0]?.trim() ?? request.ip;
  }
}
