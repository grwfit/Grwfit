import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import type { Response, NextFunction } from "express";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { getPrismaClient } from "@grwfit/db";
import type { Request } from "express";
import type { AppConfig } from "../../config/configuration";

export interface AuthenticatedRequest extends Request {
  gymId?: string;
  userId?: string;
  userType?: string;
  userRole?: string;
  branchId?: string | null;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const token = this.extractToken(req);
    if (!token) return next();

    try {
      const secret = this.configService.get("jwt.accessSecret", { infer: true });
      const payload = this.jwtService.verify<{
        sub: string;
        gymId?: string;
        type: string;
        role?: string;
        branchId?: string;
      }>(token, { secret });

      req.userId = payload.sub;
      req.userType = payload.type;
      req.gymId = payload.gymId;
      req.userRole = payload.role;
      req.branchId = payload.branchId ?? null;

      // Set Postgres config vars for RLS — run in a single round-trip
      if (payload.gymId) {
        const prisma = getPrismaClient();
        await prisma.$executeRawUnsafe(
          `SELECT
            set_config('app.current_gym_id',   $1, true),
            set_config('app.current_user_id',  $2, true),
            set_config('app.current_user_role',$3, true)`,
          payload.gymId,
          payload.sub,
          payload.role ?? "",
        );
      }
    } catch (err) {
      this.logger.debug(`Token validation failed: ${err instanceof Error ? err.message : "unknown"}`);
    }

    return next();
  }

  private extractToken(req: AuthenticatedRequest): string | null {
    // 1. Authorization: Bearer <token> header (priority for API/programmatic access)
    const authHeader = req.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    // 2. httpOnly cookie (browser-based access)
    const cookies = req.cookies as Record<string, string> | undefined;
    if (cookies?.["access_token"]) {
      return cookies["access_token"];
    }

    // 3. Platform token cookie (for admin app)
    if (cookies?.["platform_token"]) {
      return cookies["platform_token"];
    }

    return null;
  }
}
