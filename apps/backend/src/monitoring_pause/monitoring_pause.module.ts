import { Module } from '@nestjs/common';
import { MonitoringPauseService } from './monitoring_pause.service';
import { MonitoringPauseController } from './monitoring_pause.controller';
import { MonitoringPauseRepository } from './monitoring_pause.repository';

@Module({
    providers: [MonitoringPauseService, MonitoringPauseRepository],
    controllers: [MonitoringPauseController],
    exports: [MonitoringPauseService],
})
export class MonitoringPauseModule {}
