import { HTTP_STATUS } from '../constants';
import { AppError } from './app-error';

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication Error') {
    super(message, HTTP_STATUS.UNAUTHORIZED);
  }
}
