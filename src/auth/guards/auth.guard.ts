import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token =
      request.cookies['access_token'] ||
      request.headers.authorization?.split(' ')[1];

    if (!token) {
      return false; // No token provided
    }

    try {
      const user = await this.jwtService.verifyAsync(token);
      request.user = user;
      return true;
    } catch (e) {
      console.log(`JWT Verify Error: ${e.message}`);
      throw new UnauthorizedException('Token không hợp lệ hoặc hết hạn');
    }
  }
}
