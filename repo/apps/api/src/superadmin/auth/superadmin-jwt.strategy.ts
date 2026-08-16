import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { SuperadminJwtPayload } from './superadmin-jwt-payload';

@Injectable()
export class SuperadminJwtStrategy extends PassportStrategy(Strategy, 'superadmin-jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.superadmin_access_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('superadmin.jwtSecret') ?? 'dev-secret-change-me',
    });
  }

  validate(payload: SuperadminJwtPayload): SuperadminJwtPayload {
    return payload;
  }
}
