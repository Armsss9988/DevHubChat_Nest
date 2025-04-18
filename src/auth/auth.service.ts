import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { Role, User } from '@prisma/client';
import { Request } from 'express';
@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
  async getTokens(user: User) {
    const { password, ...userWithoutPassword } = user;
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(userWithoutPassword, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwt.signAsync(userWithoutPassword, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken, user };
  }
  async login(user: User) {
    return this.getTokens(user);
  }

  async register(dto: RegisterDto) {
    const hash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.name,
        password: hash,
        role: Role.USER,
      },
    });

    return this.login(user);
  }

  async refreshToken(req: Request) {
    const refreshToken = req.cookies['refresh_token'];
    console.log('ref token:', refreshToken);
    console.log('calling rferesh');
    if (!refreshToken) throw new ForbiddenException('No token');

    try {
      const payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      console.log('payload', payload);
      const { iat, exp, ...user } = payload;

      return this.getTokens(user);
    } catch (error) {
      console.error('Refresh token error:', error.message);
      throw new ForbiddenException('Invalid token');
    }
  }
}
