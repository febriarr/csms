import { Module } from '@nestjs/common';
import { AlertController } from './alert.controller';
import { AlertRepository } from './alert.repository';
import { AlertService } from './alert.service';

@Module({
    controllers: [AlertController],
    providers: [AlertService, AlertRepository],
    exports: [AlertService],
})
export class AlertModule {}
