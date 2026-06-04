import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response } from 'express';
import { RequestWithCorrelation } from './request-with-correlation';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: RequestWithCorrelation, response: Response, next: NextFunction) {
    const incomingCorrelationId = request.headers[CORRELATION_ID_HEADER];
    const correlationId = Array.isArray(incomingCorrelationId)
      ? incomingCorrelationId[0]
      : incomingCorrelationId;

    request.correlationId = correlationId || randomUUID();
    response.setHeader(CORRELATION_ID_HEADER, request.correlationId);

    next();
  }
}
