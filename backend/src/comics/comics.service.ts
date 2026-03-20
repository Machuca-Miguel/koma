import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import { QueryComicDto } from './dto/query-comic.dto';

@Injectable()
export class ComicsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryComicDto) {
    const { search, publisher, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { publisher: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(publisher && {
        publisher: { contains: publisher, mode: 'insensitive' as const },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.comic.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.comic.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const comic = await this.prisma.comic.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    });
    if (!comic) throw new NotFoundException(`Cómic con id ${id} no encontrado`);
    return comic;
  }

  async create(dto: CreateComicDto) {
    return this.prisma.comic.create({ data: dto });
  }

  async update(id: string, dto: UpdateComicDto) {
    await this.findOne(id);
    return this.prisma.comic.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.comic.delete({ where: { id } });
  }
}
