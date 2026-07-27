import { Router } from 'express';
import { TemperatureRepository } from '../features/temperature/temperature.repository';
import { db } from '../database';
import { TemperatureService } from '../features/temperature/temperature.services';
import { DevicesRepository } from '../features/devices/devices.repository';
import { AlertsRepository } from '../features/alerts/alerts.repository';
import { TemperatureController } from '../features/temperature/temperature.controller';
import { validateRequest } from '../middleware/validate-request';
import { createTemperatureSchema } from '../features/temperature/temperature.validator';

const router = Router();

// Repository
const temperatureRepository = new TemperatureRepository(db);
const devicesRepository = new DevicesRepository(db);
const alertsRepository = new AlertsRepository(db);

// Services
const temperatureService = new TemperatureService(temperatureRepository, devicesRepository, alertsRepository);

// Controller
const temperatureController = new TemperatureController(temperatureService);

router.post('/telemetry', validateRequest({ body: createTemperatureSchema }), temperatureController.record);

export default router;
