import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { AuthenticatedRequest } from './authenticated-request.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  login(@Request() req: AuthenticatedRequest) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario autenticado' })
  getProfile(@Request() req: AuthenticatedRequest) {
    return req.user;
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Iniciar sesión con Google' })
  googleLogin() {
    // Passport redirige automáticamente a Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback de Google OAuth' })
  googleCallback(
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const { accessToken, user } = req.user as unknown as {
      accessToken: string;
      user: { id: string; email: string; username: string; language: string };
    };
    const encoded = Buffer.from(JSON.stringify(user)).toString('base64');
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}&u=${encoded}`);
  }
}
