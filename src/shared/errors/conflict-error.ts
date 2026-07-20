import { HTTP_STATUS } from '../constants/index.js';

import { AppError } from './app-error.js';

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, HTTP_STATUS.CONFLICT);
  }
}
