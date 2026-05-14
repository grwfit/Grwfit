import { Module, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { BullModule } from "@nestjs/bull";
import { configuration } from "./config/configuration";
import { AppController } from "./app.controller";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AdminAuthModule } from "./modules/admin-auth/admin-auth.module";
import { StaffModule } from "./modules/staff/staff.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { MembersModule } from "./modules/members/members.module";
import { CheckinsModule } from "./modules/checkins/checkins.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { RenewalsModule } from "./modules/renewals/renewals.module";
import { WhatsAppModule } from "./modules/whatsapp/whatsapp.module";
import { LeadsModule } from "./modules/leads/leads.module";
import { TrainersModule } from "./modules/trainers/trainers.module";
import { PlansModule } from "./modules/plans/plans.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { MemberPortalModule } from "./modules/member-portal/member-portal.module";
import { WebsiteModule } from "./modules/website/website.module";
import { PlatformModule } from "./modules/platform/platform.module";
import { ClassesModule } from "./modules/classes/classes.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { ComplianceModule } from "./modules/compliance/compliance.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { TenantMiddleware } from "./common/middleware/tenant.middleware";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { AuditLogInterceptor } from "./common/interceptors/audit-log.interceptor";
import type { AppConfig } from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: [".env.local", ".env"],
    }),

    JwtModule.registerAsync({
      global: true,
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get("jwt.accessSecret", { infer: true }),
        signOptions: { expiresIn: config.get("jwt.accessExpiresIn", { infer: true }) },
      }),
      inject: [ConfigService],
    }),

    ThrottlerModule.forRootAsync({
      useFactory: (config: ConfigService<AppConfig, true>) => [
        {
          ttl: config.get("throttle.ttl", { infer: true }),
          limit: config.get("throttle.limit", { infer: true }),
        },
      ],
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        redis: config.get("redis.url", { infer: true }),
      }),
      inject: [ConfigService],
    }),

    HealthModule,
    AuthModule,
    AdminAuthModule,
    StaffModule,
    BranchesModule,
    MembersModule,
    CheckinsModule,
    PaymentsModule,
    RenewalsModule,
    WhatsAppModule,
    LeadsModule,
    TrainersModule,
    PlansModule,
    ReportsModule,
    MemberPortalModule,
    WebsiteModule,
    PlatformModule,
    ClassesModule,
    OnboardingModule,
    ComplianceModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes({ path: "*", method: RequestMethod.ALL });
  }
}
