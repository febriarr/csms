import { Router } from 'express';
import {
  authController,
  dashboardController,
  deviceDiagnosticsLogsController,
  devicesController,
  notificationsRecipientsController,
  reportsController,
} from '../container/index';
import { streamDeviceStatus } from '../sse/sse.controller';
import { authenticate } from '../middleware/authenticate.middleware';
import { validateRequest } from '../middleware/validate-request';
import { notificationRecipientsQuerySchema } from '../features/notifications-recipients/notifications-recipients.validator';
import whatsappRoute from '../shared/whatsapp/whatsapp.controller';
import { temperatureExportQuerySchema, temperatureReportQuerySchema } from '../features/reports/reports.validator';
import { diagnosticsReportQuerySchema } from '../features/device-diagnostic-logs/device-diagnostics-logs.validator';

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
router.get(
  '/dashboard/reports/temperature',
  validateRequest({ query: temperatureReportQuerySchema }),
  reportsController.temperatureReport
);
router.get(
  '/dashboard/reports/temperature/export',
  validateRequest({ query: temperatureExportQuerySchema }),
  reportsController.exportTemperatureReport
);
router.get(
  '/dashboard/reports/diagnostics',
  validateRequest({ query: diagnosticsReportQuerySchema }),
  deviceDiagnosticsLogsController.diagnosticsReport
);
router.get('/dashboard/reports/diagnostics/detail', deviceDiagnosticsLogsController.diagnosticsDetail);

export default router;
