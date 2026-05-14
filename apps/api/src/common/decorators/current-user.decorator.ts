import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "../middleware/tenant.middleware";

export const CurrentUser = createParamDecorator(
  (field: keyof AuthenticatedRequest | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    if (field) return request[field];
    return {
      userId: request.userId,
      gymId: request.gymId,
      userType: request.userType,
      userRole: request.userRole,
      branchId: request.branchId,
    };
  },
);
