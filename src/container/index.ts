import { db } from '../database';
import { AlertsRepository } from '../features/alerts/alerts.repository';
import { AuthController } from '../features/auth/auth.controller';
import { AuthService } from '../features/auth/auth.service';
import { DeviceController } from '../features/devices/devices.controller';
import { DevicesRepository } from '../features/devices/devices.repository';
import { DevicesService } from '../features/devices/devices.service';
import { NotificationsRecipientsController } from '../features/notifications-recipients/notifications-recipients.controller';
import { NotificationsRecipientsRepository } from '../features/notifications-recipients/notifications-recipients.repository';
import { NotificationsRecipientsService } from '../features/notifications-recipients/notifications-recipients.service';
import { TemperatureController } from '../features/temperature/temperature.controller';
import { TemperatureRepository } from '../features/temperature/temperature.repository';
import { TemperatureService } from '../features/temperature/temperature.services';
import { UsersRepository } from '../features/users/users.repository';
import { UsersService } from '../features/users/users.service';

const temperatureRepository = new TemperatureRepository(db);
const devicesRepository = new DevicesRepository(db);
const alertsRepository = new AlertsRepository(db);
const usersRepository = new UsersRepository(db);
const notificationsRecipientsRepository = new NotificationsRecipientsRepository(db);

// Services
const temperatureService = new TemperatureService(
  temperatureRepository,
  devicesRepository,
  alertsRepository,
  notificationsRecipientsRepository
);
const devicesService = new DevicesService(devicesRepository);
const usersService = new UsersService(usersRepository);
const authService = new AuthService(usersService);
const notificationsRecipientsService = new NotificationsRecipientsService(notificationsRecipientsRepository);

// Controller
const temperatureController = new TemperatureController(temperatureService);
const devicesController = new DeviceController(devicesService);
const authController = new AuthController(authService);
const notificationsRecipientsController = new NotificationsRecipientsController(notificationsRecipientsService);

export {
  temperatureRepository,
  devicesRepository,
  alertsRepository,
  temperatureService,
  devicesService,
  temperatureController,
  devicesController,
  authController,
  notificationsRecipientsController,
};
