import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestWithCorrelation } from './request-with-correlation';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithCorrelation>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.logRequest(request, Date.now() - startedAt),
        error: (error: { status?: number; message?: string }) =>
          this.logRequest(request, Date.now() - startedAt, error),
      }),
    );
  }

  private logRequest(
    request: RequestWithCorrelation,
    durationMs: number,
    error?: { status?: number; message?: string },
  ) {
    const payload = {
      correlationId: request.correlationId,
      method: request.method,
      path: request.originalUrl,
      statusCode: error?.status ?? 'OK',
      durationMs,
      error: error?.message,
    };

    if (error) {
      this.logger.warn(JSON.stringify(payload));
      return;
    }

    this.logger.log(JSON.stringify(payload));
  }
}
