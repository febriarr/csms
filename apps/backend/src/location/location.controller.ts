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
import { LocationService } from './location.service';
import { ZodValidationPipe } from '@/common/pipes/zod_validation.pipe';
import {
    type CreateLocationInput,
    createLocationSchema,
    type LocationQuery,
    locationQuerySchema,
    type UpdateLocationInput,
    updateLocationSchema,
} from '@workspace/validator';

@Controller('location')
export class LocationController {
    constructor(private readonly locationService: LocationService) {}

    @Get()
    findAll(@Query(new ZodValidationPipe(locationQuerySchema)) query: LocationQuery) {
        return this.locationService.findAll(query);
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    created(@Body(new ZodValidationPipe(createLocationSchema)) body: CreateLocationInput) {
        return this.locationService.create(body);
    }

    @Patch(':id')
    update(
        @Param('id', new ParseUUIDPipe()) id: string,
        @Body(new ZodValidationPipe(updateLocationSchema)) body: UpdateLocationInput,
    ) {
        return this.locationService.update(id, body);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async remove(@Param('id', new ParseUUIDPipe()) id: string) {
        await this.locationService.remove(id);
    }
}
