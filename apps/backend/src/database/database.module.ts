import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DatabaseProvider } from './database.provider';

@Global()
@Module({
    providers: [DatabaseProvider, DatabaseService],
    exports: [DatabaseService],
})
export class DatabaseModule {}
