import { Module } from '@nestjs/common';
import { DeviceController } from './device.controller';
import { DeviceService } from './device.service';
import { DeviceRepository } from './device.repository';
import { MonitoringPauseModule } from '@/monitoring_pause/monitoring_pause.module';

@Module({
    imports: [MonitoringPauseModule],
    controllers: [DeviceController],
    providers: [DeviceService, DeviceRepository],
    exports: [DeviceRepository, DeviceService],
})
export class DeviceModule {}
