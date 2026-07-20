import { HTTP_STATUS } from '../constants/index.js';

import { AppError } from './app-error.js';

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, HTTP_STATUS.BAD_REQUEST);
  }
}
