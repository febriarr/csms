import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
    createDivisionSchema,
    updateDivisionSchema,
    type CreateDivisionInput,
    type UpdateDivisionInput,
} from '@workspace/validator';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import { DivisionService } from './division.service';

@Controller('division')
export class DivisionController {
    constructor(private readonly divisionService: DivisionService) {}

    @Get()
    findAll() {
        return this.divisionService.findAll();
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body(new ZodValidationPipe(createDivisionSchema)) body: CreateDivisionInput) {
        return this.divisionService.create(body);
    }

    @Patch(':id')
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body(new ZodValidationPipe(updateDivisionSchema)) body: UpdateDivisionInput,
    ) {
        return this.divisionService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
        await this.divisionService.remove(id);
    }
}
