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

  async addTag(comicId: string, name: string) {
    await this.findOne(comicId);
    const trimmed = name.trim();
    const slug = trimmed
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const tag = await this.prisma.tag.upsert({
      where: { slug },
      create: { name: trimmed, slug },
      update: {},
    });
    await this.prisma.comicTag.upsert({
      where: { comicId_tagId: { comicId, tagId: tag.id } },
      create: { comicId, tagId: tag.id },
      update: {},
    });
    return this.findOne(comicId);
  }

  async removeTag(comicId: string, tagId: string) {
    await this.prisma.comicTag.deleteMany({ where: { comicId, tagId } });
    return this.findOne(comicId);
  }

  async getTagsByUser(userId: string) {
    const userComics = await this.prisma.userComic.findMany({
      where: { userId },
      select: { comic: { select: { tags: { include: { tag: true } } } } },
    });
    const tagMap = new Map<
      string,
      { id: string; name: string; slug: string }
    >();
    for (const uc of userComics) {
      for (const ct of uc.comic.tags) {
        if (!tagMap.has(ct.tag.id)) {
          tagMap.set(ct.tag.id, {
            id: ct.tag.id,
            name: ct.tag.name,
            slug: ct.tag.slug,
          });
        }
      }
    }
    return Array.from(tagMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }
}
