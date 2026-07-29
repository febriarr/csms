import { db } from '../database';
import { AlertsRepository } from '../features/alerts/alerts.repository';
import { DeviceController } from '../features/devices/devices.controller';
import { DevicesRepository } from '../features/devices/devices.repository';
import { DevicesService } from '../features/devices/devices.service';
import { TemperatureController } from '../features/temperature/temperature.controller';
import { TemperatureRepository } from '../features/temperature/temperature.repository';
import { TemperatureService } from '../features/temperature/temperature.services';

const temperatureRepository = new TemperatureRepository(db);
const devicesRepository = new DevicesRepository(db);
const alertsRepository = new AlertsRepository(db);

// Services
const temperatureService = new TemperatureService(temperatureRepository, devicesRepository, alertsRepository);
const devicesService = new DevicesService(devicesRepository);

// Controller
const temperatureController = new TemperatureController(temperatureService);
const devicesController = new DeviceController(devicesService);

export {
  temperatureRepository,
  devicesRepository,
  alertsRepository,
  temperatureService,
  devicesService,
  temperatureController,
  devicesController,
};
