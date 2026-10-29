import { Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import { alertQuerySchema, type AlertQuery } from '@workspace/validator';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import { AlertService } from './alert.service';

@Controller('alert')
export class AlertController {
    constructor(private readonly alertService: AlertService) {}

    @Get()
    findAll(@Query(new ZodValidationPipe(alertQuerySchema)) query: AlertQuery) {
        return this.alertService.findAll(query);
    }

    @Patch(':id/acknowledge')
    acknowledge(@Param('id', new ParseUUIDPipe()) id: string, @Session() session: UserSession) {
        return this.alertService.acknowledge(id, session.user.id);
    }
}
