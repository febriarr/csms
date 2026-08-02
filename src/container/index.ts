import { db } from '../database';
import { AlertsRepository } from '../features/alerts/alerts.repository';
import { AuthController } from '../features/auth/auth.controller';
import { AuthService } from '../features/auth/auth.service';
import { DeviceController } from '../features/devices/devices.controller';
import { DevicesRepository } from '../features/devices/devices.repository';
import { DevicesService } from '../features/devices/devices.service';
import { TemperatureController } from '../features/temperature/temperature.controller';
import { TemperatureRepository } from '../features/temperature/temperature.repository';
import { TemperatureService } from '../features/temperature/temperature.services';
import { UsersRepository } from '../features/users/users.repository';
import { UsersService } from '../features/users/users.service';

const temperatureRepository = new TemperatureRepository(db);
const devicesRepository = new DevicesRepository(db);
const alertsRepository = new AlertsRepository(db);
const usersRepository = new UsersRepository(db);

// Services
const temperatureService = new TemperatureService(temperatureRepository, devicesRepository, alertsRepository);
const devicesService = new DevicesService(devicesRepository);
const usersService = new UsersService(usersRepository);
const authService = new AuthService(usersService);

// Controller
const temperatureController = new TemperatureController(temperatureService);
const devicesController = new DeviceController(devicesService);
const authController = new AuthController(authService);

export {
  temperatureRepository,
  devicesRepository,
  alertsRepository,
  temperatureService,
  devicesService,
  temperatureController,
  devicesController,
  authController,
};
