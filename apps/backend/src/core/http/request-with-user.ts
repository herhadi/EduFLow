import { Request } from 'express';
import { AuthUser } from '@eduflow/shared';

export interface RequestWithUser extends Request {
  user: AuthUser;
}
