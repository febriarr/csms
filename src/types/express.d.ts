import { JwtPayload } from './auth.type';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
