import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { Request } from "express";
import { getPrismaClient } from "@grwfit/db";
import type { AuthenticatedRequest } from "../middleware/tenant.middleware";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!MUTATING_METHODS.has(request.method) || !request.userId) {
      return next.handle();
    }

    const action = this.methodToAction(request.method);
    const entity = this.extractEntity(request.path);

    return next.handle().pipe(
      tap({
        next: () => {
          this.writeAuditLog({
            gymId: request.gymId,
            actorId: request.userId!,
            actorType: (request.userType ?? "staff") as "staff" | "member" | "platform",
            action,
            entity,
            ip: request.ip ?? request.socket?.remoteAddress,
            userAgent: request.headers["user-agent"],
          }).catch((err) => {
            this.logger.error("Audit log write failed", err);
          });
        },
      }),
    );
  }

  private async writeAuditLog(data: {
    gymId?: string;
    actorId: string;
    actorType: "staff" | "member" | "platform";
    action: "create" | "update" | "delete";
    entity: string;
    ip?: string;
    userAgent?: string;
  }) {
    const prisma = getPrismaClient();
    await prisma.auditLog.create({
      data: {
        gymId: data.gymId ?? null,
        actorId: data.actorId,
        actorType: data.actorType,
        action: data.action,
        entity: data.entity,
        ip: data.ip ?? null,
        userAgent: data.userAgent ?? null,
      },
    });
  }

  private methodToAction(method: string): "create" | "update" | "delete" {
    if (method === "POST") return "create";
    if (method === "DELETE") return "delete";
    return "update";
  }

  private extractEntity(path: string): string {
    const segments = path.split("/").filter(Boolean);
    const versionIndex = segments.findIndex((s) => s.startsWith("v"));
    const start = versionIndex !== -1 ? versionIndex + 2 : 1;
    return segments[start] ?? segments[segments.length - 1] ?? "unknown";
  }
}
