import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'GOOGLE_CLIENT_ID_NOT_SET',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'GOOGLE_CLIENT_SECRET_NOT_SET',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    return this.authService.validateGoogleUser(profile);
  }
}
