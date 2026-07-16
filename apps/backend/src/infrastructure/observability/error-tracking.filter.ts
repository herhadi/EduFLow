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

type ErrorResponseBody = {
  error?: string;
  message?: string | string[];
};

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
    const exceptionBody = this.getExceptionBody(exception);
    const logMessage =
      exception instanceof Error ? exception.message : 'Internal server error';
    const clientMessage =
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? 'Internal server error'
        : exceptionBody.message ?? logMessage;
    const errorLabel = exceptionBody.error ?? this.getStatusLabel(status);

    this.logger.error(
      JSON.stringify({
        correlationId: request.correlationId,
        method: request.method,
        path: request.originalUrl,
        statusCode: status,
        message: logMessage,
      }),
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      message: clientMessage,
      error: errorLabel,
      correlationId: request.correlationId,
      path: request.originalUrl,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }

  private getExceptionBody(exception: unknown): ErrorResponseBody {
    if (!(exception instanceof HttpException)) {
      return {};
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return { message: response };
    }

    if (!response || typeof response !== 'object') {
      return {};
    }

    const body = response as Record<string, unknown>;
    const message = body.message;
    const error = body.error;

    return {
      ...(typeof error === 'string' ? { error } : {}),
      ...(typeof message === 'string' || Array.isArray(message)
        ? { message: message as string | string[] }
        : {}),
    };
  }

  private getStatusLabel(status: number) {
    return HttpStatus[status] ?? 'Error';
  }
}
