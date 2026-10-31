import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env, validateEnv } from './config/env.validation';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseService } from './database/database.service';
import { createAuth } from './auth/auth';
import { TemperatureModule } from './temperature/temperature.module';
import { DivisionModule } from './division/division.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { buildThrottlerOptions } from './common/throttle/throttle.config';
import { HealthModule } from './health/health.module';
import { AllExceptionsFilter } from './common/filters/all_exceptions.filter';
import { LocationModule } from './location/location.module';
import { ColdStorageModule } from './cold_storage/cold_storage.module';
import { NotificationModule } from './notification/notification.module';
import { DeviceModule } from './device/device.module';
import { TransformInterceptor } from './common/interceptors/api_response.interceptor';
import { MonitoringPauseModule } from './monitoring_pause/monitoring_pause.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AlertModule } from './alert/alert.module';
import { DiagnosticModule } from './diagnostic/diagnostic.module';
import { DeviceEventModule } from './event/device_event.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UserModule } from './user/user.module';
import { OverviewModule } from './overview/overview.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validateEnv,
        }),

        ScheduleModule.forRoot(),

        ThrottlerModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService<Env, true>) =>
                buildThrottlerOptions({ THROTTLE_LIMIT: config.get('THROTTLE_LIMIT', { infer: true }) }),
        }),

        DatabaseModule,

        AuthModule.forRootAsync({
            inject: [ConfigService, DatabaseService],
            useFactory: (config: ConfigService<Env, true>, database: DatabaseService) => ({
                auth: createAuth({
                    db: database.db,
                    secret: config.get('BETTER_AUTH_SECRET', { infer: true }),
                    baseURL: config.get('BETTER_AUTH_URL', { infer: true }),
                    trustedOrigins: [config.get('WEB_URL', { infer: true })],
                    cookieDomain: config.get('AUTH_COOKIE_DOMAIN', { infer: true }),
                    isProd: config.get('NODE_ENV', { infer: true }) === 'production',
                }),
            }),
        }),

        TemperatureModule,

        DivisionModule,

        LocationModule,

        ColdStorageModule,

        NotificationModule,

        DeviceModule,

        MonitoringPauseModule,

        WhatsappModule,

        AlertModule,

        DiagnosticModule,

        DeviceEventModule,

        UserModule,

        OverviewModule,

        HealthModule,
    ],
    providers: [
        {
            // first, so a flood is turned away before it costs a session lookup
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: TransformInterceptor,
        },
    ],
})
export class AppModule {}
