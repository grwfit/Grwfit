import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, map } from "rxjs";
import type { Response } from "express";

@Injectable()
export class TransformResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        const res = context.switchToHttp().getResponse<Response>();
        if (res.headersSent) return data;

        if (
          data !== null &&
          data !== undefined &&
          typeof data === "object" &&
          "success" in (data as Record<string, unknown>)
        ) {
          return data;
        }

        return { success: true, data };
      }),
    );
  }
}
