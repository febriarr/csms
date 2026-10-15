import { Injectable } from '@nestjs/common';
import { DivisionRepository } from './division.repository';
import { Division } from '@workspace/shared';
import { EntityNotFoundException, ResourceInUseException } from '@/common/exception/app.exception';
import { CreateDivisionInput, UpdateDivisionInput } from '@workspace/validator';

@Injectable()
export class DivisionService {
    constructor(private readonly repo: DivisionRepository) {}

    async create(input: CreateDivisionInput): Promise<Division> {
        return this.repo.create(input);
    }

    async update(id: string, input: UpdateDivisionInput): Promise<Division> {
        const updated = await this.repo.updateById(id, input);

        if (!updated) throw new EntityNotFoundException('divisions', id);

        return updated;
    }

    async findAll(): Promise<Division[]> {
        return this.repo.findMany();
    }

    async remove(id: Division['id']): Promise<void> {
        if (await this.repo.hasLocations(id)) {
            throw new ResourceInUseException('Divisi tidak dapat dihapus karena masih dipakai oleh lokasi');
        }

        await this.repo.destroy(id);
    }
}
