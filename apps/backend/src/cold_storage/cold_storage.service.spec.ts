import { Test, TestingModule } from '@nestjs/testing';
import { ColdStorageService } from './cold_storage.service';

describe('ColdStorageService', () => {
  let service: ColdStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ColdStorageService],
    }).compile();

    service = module.get<ColdStorageService>(ColdStorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
