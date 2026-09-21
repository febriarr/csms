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
import { isPublic } from '../middleware/is-public.middleware';
import fs from 'node:fs/promises';
import path from 'node:path';
import { renderMarkdown } from '../shared/utils/renderMarkdown';

const router = Router();

router.get('/', devicesController.renderStatusPage);

// auth route
router.get('/pages/login', authController.loginPage);

router.get('/events/device-status', streamDeviceStatus);
router.get('/device/:deviceId/alerts-partial', isPublic, devicesController.findDeviceByIdWithAlert);

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
router.get('/dashboard/docs/user-guide', async (req, res) => {
  const filePath = path.join(process.cwd(), 'docs', 'CSMS_Website_User_Guide.md');

  const source = await fs.readFile(filePath, 'utf8');

  const content = renderMarkdown(source);

  res.render('dashboard/docs/user-guide', {
    title: 'User Guide',
    currentPath: '/dashboard/docs/user-guide',
    pageTitle: 'User Guide',
    pageDescription: 'Panduan Penggunaan Website',
    layout: 'layouts/dashboard',
    content,
  });
});

export default router;
