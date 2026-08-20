import { Router } from 'express';
import { authController, devicesController, notificationsRecipientsController } from '../container/index';
import { streamDeviceStatus } from '../sse/sse.controller';
import dashboardController from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/authenticate.middleware';
import { validateRequest } from '../middleware/validate-request';
import { notificationRecipientsQuerySchema } from '../features/notifications-recipients/notifications-recipients.validator';
import whatsappRoute from '../shared/whatsapp/whatsapp.controller';

const router = Router();

router.get('/', devicesController.renderStatusPage);

// auth route
router.get('/pages/login', authController.loginPage);

router.get('/events/device-status', streamDeviceStatus);
router.get('/device/:deviceId/alerts-partial', devicesController.findDeviceByIdWithAlert);

router.use(authenticate); // Apply authentication middleware to all routes below
router.use(whatsappRoute);
router.get('/dashboard', dashboardController.index);
router.get('/dashboard/users', dashboardController.users);
router.get('/dashboard/devices', dashboardController.devices);
router.get('/dashboard/devices/create', dashboardController.createDevice);
router.get('/dashboard/devices/:id/update', dashboardController.updateDevice);
router.get('/dashboard/notification-logs', dashboardController.notificationLogs);
router.get(
  '/dashboard/notifications-recipients',
  validateRequest({ query: notificationRecipientsQuerySchema }),
  notificationsRecipientsController.findAll
);
router.get('/dashboard/notifications-recipients/create', notificationsRecipientsController.pageCreate);
router.get('/dashboard/notifications-recipients/:id/edit', notificationsRecipientsController.pageUpdate);

export default router;
