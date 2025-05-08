import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;
    const startTime = Date.now();

    console.log(`[Middleware-Start] Incoming Request: ${method} ${originalUrl}`);

    res.on('finish', () => {
      const elapsedTime = Date.now() - startTime;
      console.log(`[Middleware-End] Response: ${method} ${originalUrl} - Status: ${res.statusCode} - Time: ${elapsedTime}ms`);
    });

    res.on('close', () => {
      console.log(`[Middleware-Close] Request closed unexpectedly: ${method} ${originalUrl}`);
    });

    res.on('error', (err) => {
      console.error(`[Middleware-Error] Error during response: ${err.message}`);
    });

    try {
      next(); // Quan trọng: đưa flow qua Router
    } catch (error) {
      console.error(`[Middleware-Catch] Exception in middleware: ${error.message}`);
      next(error);
    }
  }
}
