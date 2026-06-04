import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithCorrelation } from './request-with-correlation';

@Catch()
export class ErrorTrackingFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorTrackingFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithCorrelation>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof Error ? exception.message : 'Internal server error';

    this.logger.error(
      JSON.stringify({
        correlationId: request.correlationId,
        method: request.method,
        path: request.originalUrl,
        statusCode: status,
        message,
      }),
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message,
      correlationId: request.correlationId,
    });
  }
}
