import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { PERMISSIONS } from '../../common/constants/permissions';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RequestWithUser } from '../../core/http/request-with-user';
import { AuthService } from './auth.service';
import { ChangeInitialPasswordDto } from './dto/change-initial-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RevokeSessionDto } from './dto/revoke-session.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';

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
