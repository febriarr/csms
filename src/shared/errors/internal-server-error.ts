import { HTTP_STATUS } from '../constants/index.js';

import { AppError } from './app-error.js';

export class InternalServerError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
  }
}
