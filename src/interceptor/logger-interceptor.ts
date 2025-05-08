import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
  } from '@nestjs/common';
  import { Observable, tap } from 'rxjs';
  
  @Injectable()
  export class LoggingInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const req = context.switchToHttp().getRequest();
      const { method, originalUrl } = req;
  
      console.log(`[Interceptor] Entered route: ${method} ${originalUrl}`);
      console.log(`[Interceptor] Controller: ${context.getClass().name}`);
      console.log(`[Interceptor] Handler: ${context.getHandler().name}`);
  
      const now = Date.now();
      return next.handle().pipe(
        tap(() => {
          console.log(`[Interceptor] Completed ${method} ${originalUrl} in ${Date.now() - now}ms`);
        }),
      );
    }
  }
  