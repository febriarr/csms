import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request';
import { createTemperatureSchema } from '../features/temperature/temperature.validator';
import { authController, devicesController, temperatureController } from '../container';
import { createDeviceSchema } from '../features/devices/devices.validator';

const router = Router();

router.post('/telemetry', validateRequest({ body: createTemperatureSchema }), temperatureController.record);

// auth
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.post('/auth/logout', authController.logout);
router.get('/auth/me', authController.me);

// device
router.post('/devices', validateRequest({ body: createDeviceSchema }), devicesController.create);
router.delete('/devices/:id', devicesController.deleteDevice);

export default router;
