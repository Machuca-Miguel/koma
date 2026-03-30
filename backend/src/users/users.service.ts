import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import type { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(email: string, username: string, password: string) {
    const existingEmail = await this.findByEmail(email);
    if (existingEmail) throw new ConflictException('El email ya está en uso');

    const existingUsername = await this.findByUsername(username);
    if (existingUsername)
      throw new ConflictException('El nombre de usuario ya está en uso');

    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.user.create({
      data: { email, username, passwordHash },
    });
  }

  async validatePassword(
    plainPassword: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hash);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Username already taken');
      }
    }
    return this.prisma.user.update({ where: { id: userId }, data: dto });
  }

  async findOrCreateFromGoogle(data: {
    googleId: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  }) {
    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId: data.googleId },
    });
    if (byGoogleId) return byGoogleId;

    const byEmail = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (byEmail) {
      return this.prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId: data.googleId, avatarUrl: data.avatarUrl },
      });
    }

    // Generar username único a partir del email
    const base = data.email
      .split('@')[0]
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .slice(0, 20);
    const taken = await this.prisma.user.findUnique({ where: { username: base } });
    const username = taken
      ? `${base}_${Math.random().toString(36).slice(2, 6)}`
      : base;

    return this.prisma.user.create({
      data: {
        email: data.email,
        username,
        googleId: data.googleId,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) {
      throw new UnauthorizedException('Esta cuenta usa Google para autenticarse');
    }
    const valid = await this.validatePassword(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Wrong current password');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  }
}
