import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CollectionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddComicDto } from './dto/add-comic.dto';
import { UpdateUserComicDto } from './dto/update-user-comic.dto';

@Injectable()
export class UserComicsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    filters?: { status?: CollectionStatus; page?: number; limit?: number },
  ) {
    const { status, page = 1, limit = 20 } = filters ?? {};
    const skip = (page - 1) * limit;
    const where = { userId, ...(status && { status }) };

    const [data, total] = await Promise.all([
      this.prisma.userComic.findMany({
        where,
        skip,
        take: limit,
        include: { comic: { include: { tags: { include: { tag: true } } } } },
        orderBy: { addedAt: 'desc' },
      }),
      this.prisma.userComic.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async add(userId: string, dto: AddComicDto) {
    const comic = await this.prisma.comic.findUnique({
      where: { id: dto.comicId },
    });
    if (!comic)
      throw new NotFoundException(`Cómic ${dto.comicId} no encontrado`);

    const existing = await this.prisma.userComic.findUnique({
      where: { userId_comicId: { userId, comicId: dto.comicId } },
    });
    if (existing)
      throw new ConflictException('El cómic ya está en tu biblioteca');

    return this.prisma.userComic.create({
      data: {
        userId,
        comicId: dto.comicId,
        status: dto.status,
        rating: dto.rating,
        notes: dto.notes,
      },
      include: { comic: true },
    });
  }

  async update(userId: string, comicId: string, dto: UpdateUserComicDto) {
    const entry = await this.prisma.userComic.findUnique({
      where: { userId_comicId: { userId, comicId } },
    });
    if (!entry)
      throw new NotFoundException('Cómic no encontrado en tu biblioteca');

    return this.prisma.userComic.update({
      where: { userId_comicId: { userId, comicId } },
      data: dto,
      include: { comic: true },
    });
  }

  async remove(userId: string, comicId: string) {
    const entry = await this.prisma.userComic.findUnique({
      where: { userId_comicId: { userId, comicId } },
    });
    if (!entry)
      throw new NotFoundException('Cómic no encontrado en tu biblioteca');

    return this.prisma.userComic.delete({
      where: { userId_comicId: { userId, comicId } },
    });
  }

  async findByComicId(userId: string, comicId: string) {
    return this.prisma.userComic.findUnique({
      where: { userId_comicId: { userId, comicId } },
    });
  }

  async getStats(userId: string) {
    const counts = await this.prisma.userComic.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    const avgRating = await this.prisma.userComic.aggregate({
      where: { userId, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      byStatus: Object.fromEntries(
        counts.map((c) => [c.status, c._count.status]),
      ),
      totalRated: avgRating._count.rating,
      averageRating: avgRating._avg.rating
        ? Math.round(avgRating._avg.rating * 10) / 10
        : null,
    };
  }
}
