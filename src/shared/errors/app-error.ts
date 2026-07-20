import { HTTP_STATUS, type HttpStatus } from '../constants/index.js';

export class AppError extends Error {
  public readonly statusCode: HttpStatus;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational = true) {
    super(message);

    this.name = new.target.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace?.(this, new.target);
  }
}
