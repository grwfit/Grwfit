import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { StaffRole, Module, Permission } from "@grwfit/shared-types";
import { PERMISSIONS } from "../constants/permissions";
import { PERMISSION_KEY } from "../decorators/requires-permission.decorator";
import type { AuthenticatedRequest } from "../middleware/tenant.middleware";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<
      { module: Module; action: Permission } | undefined
    >(PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    if (!required) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const role = request.userRole as StaffRole | undefined;

    if (!role) {
      throw new ForbiddenException("Staff role required");
    }

    const rolePerms = PERMISSIONS[role];
    const modulePerms = rolePerms?.[required.module] ?? [];

    if (!modulePerms.includes(required.action)) {
      throw new ForbiddenException(
        `Role '${role}' lacks '${required.action}' permission on '${required.module}'`,
      );
    }

    return true;
  }
}
