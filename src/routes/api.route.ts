import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request';
import { createTemperatureSchema } from '../features/temperature/temperature.validator';
import { devicesController, temperatureController } from '../container';
import { createDeviceSchema } from '../features/devices/devices.validator';

const router = Router();

router.post('/telemetry', validateRequest({ body: createTemperatureSchema }), temperatureController.record);

// device
router.post('/devices', validateRequest({ body: createDeviceSchema }), devicesController.create);

export default router;
