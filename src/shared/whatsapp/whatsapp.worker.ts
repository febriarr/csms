import { Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { whatsappService } from './whatsapp.service';
import { WhatsAppBulkAlertJob } from './whatsapp.queue';
import { getDynamicDelay, sleep } from './whatsapp.utils';
import pino from 'pino';

const logger = pino({ name: 'whatsapp-worker' });

export const whatsappWorker = new Worker<WhatsAppBulkAlertJob>(
  'whatsapp-alert',
  async job => {
    const { message, recipients, severity } = job.data;
    const results: { jid: string; success: boolean; error?: string }[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const jid = recipients[i];

      try {
        await whatsappService.sendMessage(jid, message);
        results.push({ jid, success: true });
        logger.info({ jid, index: i + 1, total: recipients.length }, 'Alert terkirim');
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ jid, success: false, error: errorMsg });
        logger.error({ jid, error: errorMsg }, 'Gagal kirim alert');
        // lanjut ke recipient berikutnya, jangan berhentiin seluruh batch
      }

      // update progress buat monitoring, dan skip delay di pesan terakhir
      await job.updateProgress(Math.round(((i + 1) / recipients.length) * 100));

      if (i < recipients.length - 1) {
        const delay = getDynamicDelay(severity);
        await sleep(delay);
      }
    }

    const failedCount = results.filter(r => !r.success).length;
    if (failedCount > 0) {
      logger.warn({ failedCount, total: recipients.length }, 'Sebagian pesan gagal terkirim');
    }

    return results;
  },
  {
    connection: redisConnection,
    concurrency: 1, // WAJIB tetap 1 — biar antar-job pun gak overlap kirimnya
  }
);

whatsappWorker.on('completed', job => {
  logger.info(`Job ${job.id} selesai diproses`);
});

whatsappWorker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, error: err.message }, 'Job gagal total');
});
