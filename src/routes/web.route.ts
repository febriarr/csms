import { Router } from 'express';
import { NotFoundError } from '../shared/errors/not-found-error';
import { devicesController } from '../container/index';
import { streamDeviceStatus } from '../sse/sse.controller';
import dashboardController from '../controllers/dashboard.controller';

const router = Router();

router.get('/', devicesController.renderStatusPage);
router.get('/dashboard', dashboardController.index);
router.get('/dashboard/users', dashboardController.users);
router.get('/dashboard/devices', dashboardController.devices);
router.get('/dashboard/devices/create', dashboardController.createDevice);
router.get('/dashboard/notification-logs', dashboardController.notificationLogs);
router.get('/dashboard/notifications-recipients', dashboardController.notificationRecipients);
router.get('/events/device-status', streamDeviceStatus);
router.get('/device/:deviceId/alerts-partial', devicesController.findDeviceByIdWithAlert);

router.get('/test-error', () => {
  throw new Error('Unexpected error');
});

router.get('/test-not-found', () => {
  throw new NotFoundError('Device not found');
});

export default router;
