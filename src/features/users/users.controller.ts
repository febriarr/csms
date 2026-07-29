import { TypedRequest } from '../../types/typed-request';
import { UsersService } from './users.service';
import type { Response, Request } from 'express';
import { CreateUserInput } from './users.validator';
import { successResponse } from '../../shared/reponse/success-response';
import { HTTP_STATUS } from '../../shared/constants';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  create = async (req: TypedRequest<CreateUserInput>, res: Response) => {
    const data = await this.usersService.create(req.body);

    return successResponse(res, {
      statusCode: HTTP_STATUS.CREATED,
      data,
    });
  };

  findMany = async (_req: Request, res: Response) => {
    const data = await this.usersService.findMany();

    return successResponse(res, {
      data,
    });
  };
}
