import { Router } from 'express';
import { validateRequest } from '../middleware/validate-request';
import { createTemperatureSchema } from '../features/temperature/temperature.validator';
import { temperatureController } from '../container';

const router = Router();

router.post('/telemetry', validateRequest({ body: createTemperatureSchema }), temperatureController.record);

export default router;
