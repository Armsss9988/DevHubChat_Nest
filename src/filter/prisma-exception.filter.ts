import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpStatus,
  } from '@nestjs/common';
  import { Prisma } from '@prisma/client';
  import { Response } from 'express';
  
  @Catch(Prisma.PrismaClientKnownRequestError)
  export class PrismaClientExceptionFilter implements ExceptionFilter {
    catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
  
      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = 'Lỗi hệ thống với Prisma';
  
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = `Trường '${exception.meta?.target}' đã tồn tại.`;
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Không tìm thấy dữ liệu.';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Sai foreign key hoặc thiếu liên kết.';
          break;
        default:
          message = exception.message;
          break;
      }
  
      response.status(status).json({
        statusCode: status,
        error: 'PrismaError',
        message,
        meta: exception.meta,
      });
    }
  }
  