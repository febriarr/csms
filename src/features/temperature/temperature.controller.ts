import { TemperatureService } from './temperature.services';
import type { Response } from 'express';
import { CreateTemperatureDto } from './temperature.validator';
import { successResponse } from '../../shared/reponse/success-response';
import { HTTP_STATUS } from '../../shared/constants';
import { TypedRequest } from '../../types/typed-request';

export class TemperatureController {
  constructor(private readonly temperatureService: TemperatureService) {}

  record = async (req: TypedRequest<CreateTemperatureDto>, res: Response) => {
    const body = req.body;
    const data = await this.temperatureService.create(body);

    return successResponse(res, {
      data,
      statusCode: HTTP_STATUS.CREATED,
    });
  };
}
