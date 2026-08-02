import { TypedRequest } from '../../types/typed-request';
import { NotificationsRecipientsService } from './notifications-recipients.service';
import type { Response } from 'express';
import {
  NotificationRecipientsInput,
  NotificationRecipientsUpdateInput,
  NotificationsRecipientsQuery,
} from './notifications-recipients.validator';
import { successResponse } from '../../shared/reponse/success-response';
import { HTTP_STATUS } from '../../shared/constants';

export class NotificationsRecipientsController {
  constructor(private readonly service: NotificationsRecipientsService) {}

  create = async (req: TypedRequest<NotificationRecipientsInput>, res: Response) => {
    const data = await this.service.create(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      message: 'Notification recipient created successfully',
      data,
    });
  };

  update = async (req: TypedRequest<NotificationRecipientsUpdateInput, unknown, { id: string }>, res: Response) => {
    const { id } = req.params;
    const data = await this.service.update(id, req.body);

    return successResponse(res, {
      message: 'Notification recipient updated successfully',
      data,
    });
  };

  findAll = async (req: TypedRequest<unknown, NotificationsRecipientsQuery, unknown>, res: Response) => {
    const data = await this.service.findAll(req.query);

    res.render('dashboard/notifications-recipients', {
      title: 'Notifications Recipients',
      layout: 'layouts/dashboard',
      currentPath: '/dashboard/notifications-recipients',
      pageTitle: 'Notifications Recipients',
      pageDescription: 'Manage notification recipients for your application.',
      pageScripts: ['/js/notifications-recipients.js'],
      currentName: req.query?.name,
      currentChannel: req.query?.channel,
      data,
    });
  };

  delete = async (req: TypedRequest<unknown, unknown, { id: string }>, res: Response) => {
    const { id } = req.params;
    const data = await this.service.delete(id);

    return successResponse(res, {
      message: 'Notification recipient deleted successfully',
      data,
    });
  };

  pageCreate = async (_req: TypedRequest, res: Response) => {
    res.render('dashboard/create-notifications-recipients', {
      title: 'Create Notification Recipient',
      layout: 'layouts/dashboard',
      currentPath: '/dashboard/notifications-recipients/create',
      pageTitle: 'Create Notification Recipient',
      pageDescription: 'Create a new notification recipient for your application.',
      pageScripts: ['/js/notifications-recipients.js'],
    });
  };

  pageUpdate = async (req: TypedRequest<unknown, unknown, { id: string }>, res: Response) => {
    const { id } = req.params;
    const data = await this.service.findById(id);

    if (!data) {
      return res.status(404).render('errors/404', {
        title: 'Notification Recipient Not Found',
        layout: 'layouts/dashboard',
        currentPath: '/dashboard/notifications-recipients',
        pageTitle: 'Notification Recipient Not Found',
        pageDescription: 'The requested notification recipient could not be found.',
      });
    }

    res.render('dashboard/update-notifications-recipients', {
      title: 'Update Notification Recipient',
      layout: 'layouts/dashboard',
      currentPath: '/dashboard/notifications-recipients',
      pageTitle: 'Update Notification Recipient',
      pageDescription: 'Update the details of an existing notification recipient.',
      pageScripts: ['/js/notifications-recipients.js'],
      data,
    });
  };
}
