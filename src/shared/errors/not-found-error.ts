import { HTTP_STATUS } from '../constants/index.js';

import { AppError } from './app-error.js';

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, HTTP_STATUS.NOT_FOUND);
  }
}
