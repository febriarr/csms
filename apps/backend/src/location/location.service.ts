import { Injectable } from '@nestjs/common';
import { LocationRepository } from './location.repository';
import { CreateLocationInput, LocationQuery, UpdateLocationInput } from '@workspace/validator';
import { Location } from '@workspace/shared';
import { EntityNotFoundException } from '@/common/exception/app.exception';

@Injectable()
export class LocationService {
    constructor(private readonly repo: LocationRepository) {}

    async create(input: CreateLocationInput): Promise<Location> {
        return this.repo.create(input);
    }

    async update(id: string, input: UpdateLocationInput): Promise<Location> {
        const updated = await this.repo.updateById(id, input);

        if (!updated) {
            throw new EntityNotFoundException('locations', id);
        }

        return updated;
    }

    async remove(id: string): Promise<void> {
        await this.repo.destroy(id);
    }

    async findAll(filter: LocationQuery): Promise<Location[]> {
        return this.repo.listLocation(filter);
    }
}
