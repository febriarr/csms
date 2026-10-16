import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env, validateEnv } from './config/env.validation';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { DatabaseService } from './database/database.service';
import { createAuth } from './auth/auth';
import { TemperatureModule } from './temperature/temperature.module';
import { DivisionModule } from './division/division.module';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/all_exceptions.filter';
import { LocationModule } from './location/location.module';
import { ColdStorageModule } from './cold_storage/cold_storage.module';
import { NotificationModule } from './notification/notification.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            validate: validateEnv,
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
    ],
    controllers: [AppController],
    providers: [
        AppService,
        {
            provide: APP_FILTER,
            useClass: AllExceptionsFilter,
        },
    ],
})
export class AppModule {}
