import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require("cookie-parser") as () => unknown;
import type { Request, Response, NextFunction } from "express";
import { AppModule } from "./app.module";
import type { AppConfig } from "./config/configuration";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
    rawBody: true,
  });

  const config = app.get<ConfigService<AppConfig, true>>(ConfigService);
  const port = config.get("port", { infer: true });
  const nodeEnv = config.get("nodeEnv", { infer: true });

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: nodeEnv === "production" ? undefined : false,
    }),
  );

  // Cookie parser — needed for httpOnly cookie auth
  app.use(cookieParser());

  // Preserve raw body for Razorpay webhook signature verification
  app.use((req: Request & { rawBody?: string }, _res: Response, next: NextFunction) => {
    if (req.path?.includes("/payments/razorpay/webhook")) {
      let data = "";
      req.on("data", (chunk: Buffer) => { data += chunk.toString(); });
      req.on("end", () => { req.rawBody = data; next(); });
    } else {
      next();
    }
  });

  const corsOrigins = [
    "https://grwfit.onrender.com",
    "https://api.grwfit.com",
    "https://crm.grwfit.com",
    "https://app.grwfit.com",
    "https://admin.grwfit.com",
    "https://m.grwfit.com",
    "https://grwfit.com",
  ];
  if (nodeEnv !== "production") {
    corsOrigins.push("http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003");
  }

  app.enableCors({
    origin: corsOrigins,
    credentials: true, // required for cookies
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Global API prefix
  app.setGlobalPrefix("api/v1");

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger docs
  if (nodeEnv !== "production" || process.env["ENABLE_SWAGGER"] === "true") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("GrwFit API")
      .setDescription("Multi-tenant SaaS CRM for Indian gyms")
      .setVersion("1.0")
      .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" }, "access-token")
      .addCookieAuth("access_token")
      .addTag("auth", "Phone OTP authentication")
      .addTag("admin-auth", "Platform admin authentication")
      .addTag("health", "Health checks")
      .addTag("app", "API root")
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("api/v1/docs", app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
    logger.log(`Swagger docs: http://localhost:${port}/api/v1/docs`);
  }

  await app.listen(port);
  logger.log(`GrwFit API running on port ${port} [${nodeEnv}]`);
  logger.log(`Health: http://localhost:${port}/api/v1/health`);
}

bootstrap();
