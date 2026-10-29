import { Module } from '@nestjs/common';
import { DeviceModule } from '@/device/device.module';
import { DiagnosticController } from './diagnostic.controller';
import { DiagnosticRepository } from './diagnostic.repository';
import { DiagnosticService } from './diagnostic.service';

@Module({
    imports: [DeviceModule],
    controllers: [DiagnosticController],
    providers: [DiagnosticService, DiagnosticRepository],
    exports: [DiagnosticService],
})
export class DiagnosticModule {}
