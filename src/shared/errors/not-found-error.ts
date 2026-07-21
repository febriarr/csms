import { HTTP_STATUS } from '../constants/index';

import { AppError } from './app-error';

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}
