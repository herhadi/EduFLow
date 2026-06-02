import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';
import { RequestWithUser } from './request-with-user';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (!requiredPermissions.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const grantedPermissions = new Set(request.user?.permissions ?? []);

    if (
      requiredPermissions.every((permission) =>
        grantedPermissions.has(permission),
      )
    ) {
      return true;
    }

    throw new ForbiddenException('Permission denied');
  }
}

