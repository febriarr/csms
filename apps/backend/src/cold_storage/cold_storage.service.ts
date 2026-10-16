import { Injectable } from '@nestjs/common';
import { ColdStorageRepository } from './cold_storage.repository';
import { BusinessRuleException, EntityNotFoundException } from '@/common/exception/app.exception';
import { ColdStorageQuery, CreateColdStorageInput, UpdateColdStorageInput } from '@workspace/validator';
import { ColdStorage, ListColdStorage } from '@workspace/shared';

@Injectable()
export class ColdStorageService {
    constructor(private readonly repo: ColdStorageRepository) {}

    private async findOrFail(id: string): Promise<boolean> {
        const row = await this.repo.findOne(id);

        if (!row) {
            throw new EntityNotFoundException('[Cold Storage]', id);
        }

        return true;
    }

    async create(input: CreateColdStorageInput): Promise<ColdStorage> {
        return this.repo.create(input);
    }

    async update(id: string, input: UpdateColdStorageInput): Promise<ColdStorage> {
        const validId = await this.findOrFail(id);
        if (!validId) throw new EntityNotFoundException('[Cold Storage]', id);

        const updated = await this.repo.updateById(id, input);

        if (!updated) throw new BusinessRuleException('Gagal update, coba lagi.');

        return updated;
    }

    async findAll(filter: ColdStorageQuery): Promise<ListColdStorage[]> {
        return this.repo.list(filter);
    }

    async remove(id: string): Promise<void> {
        await this.repo.destroy(id);
    }
}
