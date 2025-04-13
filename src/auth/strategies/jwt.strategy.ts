import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: (req) => {
        if (!req?.cookies && req.headers.authorization?.split(' ')[1])
          return null;
        return (
          req.cookies['access_token'] ||
          req.headers.authorization?.split(' ')[1]
        );
      },
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_ACCESS_SECRET ||
        'hahahahahahahahahahaehehhehehehehhehe',
    });
  }

  async validate(payload: any) {
    return payload;
  }
}
