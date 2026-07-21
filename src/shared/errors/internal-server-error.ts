import { HTTP_STATUS } from '../constants/index';

import { AppError } from './app-error';

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
  }
}
