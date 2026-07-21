import { HTTP_STATUS } from '../constants/index';

import { AppError } from './app-error';

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, HTTP_STATUS.BAD_REQUEST);
  }
}
