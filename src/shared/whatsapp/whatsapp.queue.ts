import { Queue } from 'bullmq';
import { redisConnection } from '../../config/redis';

export interface WhatsAppBulkAlertJob {
  message: string;
  recipients: string[];
  severity: 'WARNING' | 'CRITICAL' | 'OFFLINE';
}

export const whatsappQueue = new Queue<WhatsAppBulkAlertJob>('whatsapp-alert', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});
