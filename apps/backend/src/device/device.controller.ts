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
    createDeviceSchema,
    deviceQuerySchema,
    updateDeviceSchema,
    type CreateDeviceInput,
    type DeviceQuery,
    type UpdateDeviceInput,
} from '@workspace/validator';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import { DeviceService } from './device.service';

@Controller('device')
export class DeviceController {
    constructor(private readonly deviceService: DeviceService) {}

    @Get()
    findAll(@Query(new ZodValidationPipe(deviceQuerySchema)) query: DeviceQuery) {
        return this.deviceService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.deviceService.findOne(id);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(new ZodValidationPipe(createDeviceSchema)) body: CreateDeviceInput) {
        return this.deviceService.create(body);
    }

    @Patch(':id')
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body(new ZodValidationPipe(updateDeviceSchema)) body: UpdateDeviceInput,
    ) {
        return this.deviceService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', new ParseUUIDPipe()) id: string, @Session() session: UserSession): Promise<void> {
        await this.deviceService.remove(id, session.user.id);
    }
}
