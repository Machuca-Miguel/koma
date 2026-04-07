import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import type { Profile } from 'passport-google-oauth20';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) return null;

    const isValid = await this.usersService.validatePassword(
      password,
      user.passwordHash,
    );
    if (!isValid) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  login(user: {
    id: string;
    email: string;
    username: string;
    language: string;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        language: user.language,
      },
    };
  }

  async validateGoogleUser(profile: Profile) {
    const email = profile.emails?.[0]?.value ?? '';
    const avatarUrl = profile.photos?.[0]?.value;
    const user = await this.usersService.findOrCreateFromGoogle({
      googleId: profile.id,
      email,
      displayName: profile.displayName,
      avatarUrl,
    });
    return this.login(user);
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(
      dto.email,
      dto.username,
      dto.password,
    );
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        language: user.language,
      },
    };
  }
}
