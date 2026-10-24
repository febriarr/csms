import { Module } from '@nestjs/common';
import { DeviceEventController } from './device_event.controller';
import { DeviceEventService } from './device_event.service';

@Module({
    controllers: [DeviceEventController],
    providers: [DeviceEventService],
    exports: [DeviceEventService],
})
export class DeviceEventModule {}
