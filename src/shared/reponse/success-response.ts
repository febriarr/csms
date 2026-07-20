import type { Response } from 'express';

import { HTTP_STATUS, type HttpStatus } from '../constants/index.js';

type SuccessResponseOptions<T> = {
  data?: T;
  message?: string;
  statusCode?: HttpStatus;
};

export function successResponse<T>(
  res: Response,
  { data, message = 'Success', statusCode = HTTP_STATUS.OK }: SuccessResponseOptions<T>
): Response {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}
