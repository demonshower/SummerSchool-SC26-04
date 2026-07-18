import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

/**
 * 统一业务异常
 */
export class BusinessException extends HttpException {
  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, any>,
    httpStatus?: HttpStatus,
  ) {
    super(
      {
        error: {
          code,
          message,
          details,
        },
      },
      httpStatus || HttpStatus.BAD_REQUEST,
    );
  }

  static notFound(entity: string, id?: string): BusinessException {
    const code = this.getEntityNotFoundCode(entity);
    return new BusinessException(
      code,
      id ? `${entity} '${id}' not found` : `${entity} not found`,
      { entity, id },
      HttpStatus.NOT_FOUND,
    );
  }

  static versionConflict(currentVersion: number, yourVersion: number): BusinessException {
    return new BusinessException(
      ErrorCode.TRIP_VERSION_CONFLICT,
      '行程已被其他操作修改',
      { currentVersion, yourVersion },
      HttpStatus.CONFLICT,
    );
  }

  static timeConflict(itemId: string, conflictsWith: string): BusinessException {
    return new BusinessException(
      ErrorCode.ITINERARY_TIME_CONFLICT,
      '该活动与固定行程冲突',
      { itemId, conflictsWith },
      HttpStatus.CONFLICT,
    );
  }

  private static getEntityNotFoundCode(entity: string): ErrorCode {
    const map: Record<string, ErrorCode> = {
      Trip: ErrorCode.TRIP_NOT_FOUND,
      Item: ErrorCode.ITEM_NOT_FOUND,
      Quote: ErrorCode.QUOTE_NOT_FOUND,
      Content: ErrorCode.CONTENT_NOT_FOUND,
      Place: ErrorCode.PLACE_NOT_FOUND,
      Plan: ErrorCode.PLAN_NOT_FOUND,
      User: ErrorCode.NOT_FOUND,
    };
    return map[entity] || ErrorCode.NOT_FOUND;
  }
}
