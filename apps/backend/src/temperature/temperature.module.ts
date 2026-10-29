import { Module } from '@nestjs/common';
import { AlertModule } from '@/alert/alert.module';
import { DeviceModule } from '@/device/device.module';
import { DiagnosticModule } from '@/diagnostic/diagnostic.module';
import { DeviceEventModule } from '@/event/device_event.module';
import { MonitoringPauseModule } from '@/monitoring_pause/monitoring_pause.module';
import { NotificationModule } from '@/notification/notification.module';
import { TemperatureController } from './temperature.controller';
import { TemperatureExportService } from './temperature_export.service';
import { TemperatureReportService } from './temperature_report.service';
import { TemperatureRepository } from './temperature.repository';
import { TemperatureService } from './temperature.service';

@Module({
    imports: [
        AlertModule,
        DeviceEventModule,
        DeviceModule,
        DiagnosticModule,
        MonitoringPauseModule,
        NotificationModule,
    ],
    controllers: [TemperatureController],
    providers: [TemperatureService, TemperatureReportService, TemperatureExportService, TemperatureRepository],
    exports: [TemperatureService],
})
export class TemperatureModule {}
