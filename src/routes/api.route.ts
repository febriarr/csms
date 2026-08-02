import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request';
import { createTemperatureSchema } from '../features/temperature/temperature.validator';
import {
  authController,
  devicesController,
  notificationsRecipientsController,
  temperatureController,
} from '../container';
import { createDeviceSchema } from '../features/devices/devices.validator';
import { authenticate } from '../middleware/authenticate.middleware';

const router = Router();

router.post('/telemetry', validateRequest({ body: createTemperatureSchema }), temperatureController.record);

// auth
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);

router.use(authenticate); // Apply authentication middleware to all routes below
// device
router.post('/devices', validateRequest({ body: createDeviceSchema }), devicesController.create);
router.delete('/devices/:id', devicesController.deleteDevice);

// notifications recipients
router.post('/notifications-recipients', notificationsRecipientsController.create);
router.put('/notifications-recipients/:id', notificationsRecipientsController.update);
router.delete('/notifications-recipients/:id', notificationsRecipientsController.delete);

export default router;
