import { Inject, Injectable } from '@nestjs/common';
import { Database } from './database.type';
import { DB_CONNECTION, DrizzleClient } from './database.provider';

@Injectable()
export class DatabaseService {
    constructor(@Inject(DB_CONNECTION) private readonly client: DrizzleClient) {}

    get db(): Database {
        return this.client.db;
    }
}
