import { DeviceModule } from '@/device/device.module';
import { DiagnosticModule } from '@/diagnostic/diagnostic.module';
import { WhatsappModule } from '@/whatsapp/whatsapp.module';
import { Module } from '@nestjs/common';
import { OverviewController } from './overview.controller';
import { OverviewRepository } from './overview.repository';
import { OverviewService } from './overview.service';

@Module({
    imports: [DeviceModule, DiagnosticModule, WhatsappModule],
    controllers: [OverviewController],
    providers: [OverviewService, OverviewRepository],
})
export class OverviewModule {}
