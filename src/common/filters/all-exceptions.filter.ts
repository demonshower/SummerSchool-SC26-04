import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../constants/error-codes';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = ErrorCode.INVALID_INPUT;
    let message = 'Internal server error';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        if (resp.error && typeof resp.error === 'object') {
          code = resp.error.code || code;
          message = this.normalizeMessage(resp.error.message) || message;
          details = resp.error.details;
        } else {
          // class-validator / Nest ValidationPipe: { message: string[] | string, error: 'Bad Request' }
          message = this.normalizeMessage(resp.message) || message;
          if (Array.isArray(resp.message)) {
            details = { validation: resp.message };
          }
          if (status === HttpStatus.BAD_REQUEST) {
            code = ErrorCode.INVALID_INPUT;
          }
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(details && { details }),
        requestId: request.headers['x-request-id'] as string,
        path: request.url,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private normalizeMessage(msg: unknown): string {
    if (Array.isArray(msg)) return msg.join('；');
    if (typeof msg === 'string') return msg;
    if (msg == null) return '';
    return String(msg);
  }
}
