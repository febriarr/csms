import { Module } from '@nestjs/common';
import { ColdStorageController } from './cold_storage.controller';
import { ColdStorageService } from './cold_storage.service';
import { ColdStorageRepository } from './cold_storage.repository';

@Module({
    controllers: [ColdStorageController],
    providers: [ColdStorageService, ColdStorageRepository],
})
export class ColdStorageModule {}
