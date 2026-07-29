import { Router } from 'express';
import homeController from '../controllers/home.controller.js';
import { NotFoundError } from '../shared/errors/not-found-error.js';
import { devicesController } from '../container/index.js';
import { streamDeviceStatus } from '../sse/sse.controller.js';

const router = Router();

router.get('/', homeController.index);
router.get('/status', devicesController.renderStatusPage);
router.get('/events/device-status', streamDeviceStatus);

router.get('/test-error', () => {
  throw new Error('Unexpected error');
});

router.get('/test-not-found', () => {
  throw new NotFoundError('Device not found');
});

export default router;
