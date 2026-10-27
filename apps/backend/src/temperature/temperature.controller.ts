import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import {
    temperatureExportQuerySchema,
    temperatureReportQuerySchema,
    type TemperatureExportQuery,
    type TemperatureReportQuery,
} from '@workspace/validator';
import { DeviceKeyGuard } from '@/common/guards/device_key.guard';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import { TemperatureExportService } from './temperature_export.service';
import { TemperatureService } from './temperature.service';
import { telemetrySchema, type TelemetryInput } from '@workspace/validator';

@Controller('temperature')
export class TemperatureController {
    constructor(
        private readonly temperatureService: TemperatureService,
        private readonly exportService: TemperatureExportService,
    ) {}

    /**
     * The endpoint the devices post to. They have no user session, so the route skips the session guard and is
     * protected by the device key instead (header `x-device-key`). A duplicate (a retry) is a success too.
     */
    @Post()
    @AllowAnonymous()
    @UseGuards(DeviceKeyGuard)
    @HttpCode(HttpStatus.CREATED)
    ingest(@Body(new ZodValidationPipe(telemetrySchema)) body: TelemetryInput) {
        return this.temperatureService.ingest(body);
    }

    @Get('report')
    findReport(@Query(new ZodValidationPipe(temperatureReportQuerySchema)) query: TemperatureReportQuery) {
        return this.temperatureService.findReport(query);
    }

    @Get('report/export')
    async export(
        @Query(new ZodValidationPipe(temperatureExportQuerySchema)) query: TemperatureExportQuery,
    ): Promise<StreamableFile> {
        const device = await this.temperatureService.requireDevice(query.deviceId);
        const days = { from: query.from, to: query.to };

        return query.format === 'csv' ? this.exportService.csv(device, days) : this.exportService.xlsx(device, days);
    }
}
