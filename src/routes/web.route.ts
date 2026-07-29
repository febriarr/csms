import { Router } from 'express';
import { NotFoundError } from '../shared/errors/not-found-error';
import { devicesController } from '../container/index';
import { streamDeviceStatus } from '../sse/sse.controller';

const router = Router();

router.get('/', devicesController.renderStatusPage);
router.get('/events/device-status', streamDeviceStatus);
router.get('/device/:deviceId/alerts-partial', devicesController.findDeviceByIdWithAlert);

router.get('/test-error', () => {
  throw new Error('Unexpected error');
});

router.get('/test-not-found', () => {
  throw new NotFoundError('Device not found');
});

export default router;
