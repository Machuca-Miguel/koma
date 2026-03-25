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

  async updatePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const valid = await this.validatePassword(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Wrong current password');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  }
}
