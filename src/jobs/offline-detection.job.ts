import cron from 'node-cron';
import { logger } from '../shared/logger';
import { offlineDetectionService } from '../container';

// Every 30s — matches HEARTBEAT_INTERVAL_MS in devices.repository.ts, so a
// device is never more than one tick late in getting flagged.
const OFFLINE_CHECK_CRON = '*/30 * * * * *';

export function startOfflineDetectionJob(): void {
  cron.schedule(OFFLINE_CHECK_CRON, () => {
    offlineDetectionService.run().catch(err => {
      logger.error({ err }, 'Offline detection job crashed');
    });
  });

  logger.info('Offline detection job scheduled (every 30s)');
}
