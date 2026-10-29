import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import { Session, type UserSession } from '@thallesp/nestjs-better-auth';
import {
    createPauseSchema,
    endPauseSchema,
    pauseQuerySchema,
    type CreatePauseInput,
    type EndPauseInput,
    type PauseQuery,
} from '@workspace/validator';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import { MonitoringPauseService } from './monitoring_pause.service';

@Controller('monitoring-pause')
export class MonitoringPauseController {
    constructor(private readonly pauseService: MonitoringPauseService) {}

    @Get()
    findAll(@Query(new ZodValidationPipe(pauseQuerySchema)) query: PauseQuery) {
        return this.pauseService.findAll(query);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(new ZodValidationPipe(createPauseSchema)) body: CreatePauseInput, @Session() session: UserSession) {
        return this.pauseService.create(body, session.user.id);
    }

    @Patch(':id/end')
    end(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body(new ZodValidationPipe(endPauseSchema)) body: EndPauseInput,
        @Session() session: UserSession,
    ) {
        return this.pauseService.end(id, body, session.user.id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
        await this.pauseService.remove(id);
    }
}
