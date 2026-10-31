import { Module } from '@nestjs/common';
import { AlertModule } from '@/alert/alert.module';
import { DeviceEventModule } from '@/event/device_event.module';
import { MonitoringPauseModule } from '@/monitoring_pause/monitoring_pause.module';
import { NotificationModule } from '@/notification/notification.module';
import { DeviceController } from './device.controller';
import { DeviceOfflineService } from './device_offline.service';
import { DeviceRepository } from './device.repository';
import { DeviceService } from './device.service';

@Module({
    imports: [AlertModule, DeviceEventModule, MonitoringPauseModule, NotificationModule],
    controllers: [DeviceController],
    providers: [DeviceService, DeviceRepository, DeviceOfflineService],
    exports: [DeviceRepository, DeviceService, DeviceOfflineService],
})
export class DeviceModule {}
