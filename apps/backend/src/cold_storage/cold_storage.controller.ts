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
import { ColdStorageService } from './cold_storage.service';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import {
    type ColdStorageQuery,
    coldStorageQuerySchema,
    type CreateColdStorageInput,
    createColdStorageSchema,
    type UpdateColdStorageInput,
    updateColdStorageSchema,
} from '@workspace/validator';

@Controller('cold-storage')
export class ColdStorageController {
    constructor(private readonly service: ColdStorageService) {}

    @Get()
    findAll(@Query(new ZodValidationPipe(coldStorageQuerySchema)) query: ColdStorageQuery) {
        return this.service.findAll(query);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(new ZodValidationPipe(createColdStorageSchema)) body: CreateColdStorageInput) {
        return this.service.create(body);
    }

    @Patch(':id')
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body(new ZodValidationPipe(updateColdStorageSchema)) body: UpdateColdStorageInput,
    ) {
        return this.service.update(id, body);
    }

    @Delete(':id')
    remove(@Param('id', new ParseUUIDPipe()) id: string) {
        return this.service.remove(id);
    }
}
