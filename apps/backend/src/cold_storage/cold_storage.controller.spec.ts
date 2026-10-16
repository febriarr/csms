import { Test, TestingModule } from '@nestjs/testing';
import { ColdStorageController } from './cold_storage.controller';

describe('ColdStorageController', () => {
    let controller: ColdStorageController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ColdStorageController],
        }).compile();

        controller = module.get<ColdStorageController>(ColdStorageController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
