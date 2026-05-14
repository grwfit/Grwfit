import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Request, Response } from "express";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "An unexpected error occurred";
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
        code = this.statusToCode(statusCode);
      } else if (typeof exceptionResponse === "object") {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res["message"] as string) || message;
        code = (res["error"] as string) || this.statusToCode(statusCode);
        if (Array.isArray(res["message"])) {
          message = "Validation failed";
          details = { errors: res["message"] };
        }
      }
    }

    this.logger.error(
      `${request.method} ${request.url} → ${statusCode}`,
      exception instanceof Error ? exception.stack : String(exception),
      {
        gymId: (request as unknown as Record<string, unknown>)["gymId"],
        userId: (request as unknown as Record<string, unknown>)["userId"],
      },
    );

    response.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    });
  }

  private statusToCode(status: number): string {
    const map: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "UNPROCESSABLE_ENTITY",
      429: "RATE_LIMITED",
      500: "INTERNAL_ERROR",
      503: "SERVICE_UNAVAILABLE",
    };
    return map[status] ?? "ERROR";
  }
}
