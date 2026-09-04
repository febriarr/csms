import { Database, deviceDiagnosticsLogs } from '../../database';
import { BaseRepository } from '../../shared/abstract/base-repository';

export class DeviceDiagnosticLogsRepository extends BaseRepository<typeof deviceDiagnosticsLogs> {
  constructor(db: Database) {
    super(db, deviceDiagnosticsLogs);
  }
}
