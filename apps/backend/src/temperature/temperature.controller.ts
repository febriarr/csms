import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import {
    type RecentReadingsQuery,
    recentReadingsQuerySchema,
    temperatureEventsQuerySchema,
    temperatureExportQuerySchema,
    temperatureHourlyQuerySchema,
    temperatureReportQuerySchema,
    type TemperatureEventsQuery,
    type TemperatureExportQuery,
    type TemperatureHourlyQuery,
    type TemperatureReportQuery,
} from '@workspace/validator';
import { DeviceKeyGuard } from '@/common/guards/device_key.guard';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import { TemperatureExportService } from './temperature_export.service';
import { TemperatureReportService } from './temperature_report.service';
import { TemperatureService } from './temperature.service';
import { telemetrySchema, type TelemetryInput } from '@workspace/validator';
import { SkipTransform } from '@/common/decorators/skip_transform.decorator';

@Controller('temperature')
export class TemperatureController {
    constructor(
        private readonly temperatureService: TemperatureService,
        private readonly reportService: TemperatureReportService,
        private readonly exportService: TemperatureExportService,
    ) {}

    /**
     * The endpoint the devices post to. They have no user session, so the route skips the session guard and is
     * protected by the device key instead (header `x-device-key`). A duplicate (a retry) is a success too.
     * Not rate limited: every device behind one gateway shares an address, and a device that is cut off looks offline.
     */
    @Post()
    @SkipThrottle()
    @AllowAnonymous()
    @UseGuards(DeviceKeyGuard)
    @HttpCode(HttpStatus.CREATED)
    ingest(@Body(new ZodValidationPipe(telemetrySchema)) body: TelemetryInput) {
        return this.temperatureService.ingest(body);
    }

    @Get('report')
    findReport(@Query(new ZodValidationPipe(temperatureReportQuerySchema)) query: TemperatureReportQuery) {
        return this.reportService.findReport(query);
    }

    /** Alerts and planned pauses of the period, in time order: the "what happened" next to the readings. */
    @Get('report/events')
    async findEvents(@Query(new ZodValidationPipe(temperatureEventsQuerySchema)) query: TemperatureEventsQuery) {
        const device = await this.reportService.requireDevice(query.deviceId);

        return this.reportService.findEvents(device, { from: query.from, to: query.to });
    }

    /** How many readings of the period fall in each state, and how many the alert logic did not look at. */
    @Get('report/summary')
    async findSummary(@Query(new ZodValidationPipe(temperatureEventsQuerySchema)) query: TemperatureEventsQuery) {
        const device = await this.reportService.requireDevice(query.deviceId);

        return this.reportService.findSummary(device, { from: query.from, to: query.to });
    }

    /** One row per hour of the period (min, avg, max, worst status, coverage, note). At most 744 rows: no paging. */
    @Get('report/hourly')
    async findHourly(@Query(new ZodValidationPipe(temperatureHourlyQuerySchema)) query: TemperatureHourlyQuery) {
        const device = await this.reportService.requireDevice(query.deviceId);

        return this.reportService.findHourly(device, { from: query.from, to: query.to });
    }

    @Get('recent')
    findRecent(@Query(new ZodValidationPipe(recentReadingsQuerySchema)) query: RecentReadingsQuery) {
        return this.temperatureService.findRecent(query);
    }

    @SkipTransform()
    @Get('report/export')
    async export(
        @Query(new ZodValidationPipe(temperatureExportQuerySchema)) query: TemperatureExportQuery,
    ): Promise<StreamableFile> {
        const device = await this.reportService.requireDevice(query.deviceId);
        const days = { from: query.from, to: query.to };

        return query.format === 'csv'
            ? this.exportService.csv(device, days, query.granularity)
            : this.exportService.xlsx(device, days, query.granularity);
    }
}
