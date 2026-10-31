import { DeviceModule } from '@/device/device.module';
import { WhatsappModule } from '@/whatsapp/whatsapp.module';
import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
    imports: [DeviceModule, WhatsappModule],
    controllers: [HealthController],
    providers: [HealthService],
})
export class HealthModule {}
