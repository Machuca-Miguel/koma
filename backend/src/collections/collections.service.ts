import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async attachYearRange<T extends { id: string }>(collections: T[]) {
    if (!collections.length) return collections.map((col) => ({ ...col, yearRange: null }));

    const ids = collections.map((c) => c.id);

    // Fetch all collection-comic pairs that have a year in one query
    const entries = await this.prisma.collectionComic.findMany({
      where: { collectionId: { in: ids }, comic: { year: { not: null } } },
      select: { collectionId: true, comic: { select: { year: true } } },
    });

    // Build min/max map in JS
    const yearMap = new Map<string, { min: number; max: number }>();
    for (const { collectionId, comic } of entries) {
      if (comic.year === null) continue;
      const existing = yearMap.get(collectionId);
      if (!existing) {
        yearMap.set(collectionId, { min: comic.year, max: comic.year });
      } else {
        existing.min = Math.min(existing.min, comic.year);
        existing.max = Math.max(existing.max, comic.year);
      }
    }

    return collections.map((col) => ({
      ...col,
      yearRange: yearMap.get(col.id) ?? null,
    }));
  }

  async findAllByUser(userId: string) {
    const collections = await this.prisma.collection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { comics: true } },
        comics: {
          take: 4,
          orderBy: [{ position: 'asc' }, { addedAt: 'desc' }],
          select: { comic: { select: { coverUrl: true } } },
        },
      },
    });

    const withRange = await this.attachYearRange(collections);

    // Flatten cover URLs into a clean array
    return withRange.map(({ comics, ...col }) => ({
      ...col,
      previewCovers: comics
        .map((c) => c.comic.coverUrl)
        .filter((url): url is string => !!url),
    }));
  }

  async findOne(id: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
      include: { _count: { select: { comics: true } } },
    });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId && !collection.isPublic) {
      throw new ForbiddenException('No tienes acceso a esta colección');
    }
    const [withRange] = await this.attachYearRange([collection]);
    return withRange;
  }

  async findComics(collectionId: string, userId: string) {
    await this.findOne(collectionId, userId);
    const entries = await this.prisma.collectionComic.findMany({
      where: { collectionId },
      include: {
        comic: {
          include: {
            tags: { include: { tag: true } },
            userComics: {
              where: { userId },
              select: {
                isOwned: true,
                isRead: true,
                isWishlist: true,
                isFavorite: true,
                isLoaned: true,
                rating: true,
              },
              take: 1,
            },
          },
        },
      },
      orderBy: [
        { position: 'asc' },
        { addedAt: 'desc' },
      ],
    });

    // Flatten userComics[0] into a userStatus field for cleaner API shape
    return entries.map(({ comic: { userComics, ...comic }, ...entry }) => ({
      ...entry,
      comic,
      userStatus: userComics[0] ?? null,
    }));
  }

  async addComic(collectionId: string, userId: string, comicId: string) {
    await this.findOne(collectionId, userId);
    const comic = await this.prisma.comic.findUnique({ where: { id: comicId } });
    if (!comic) throw new NotFoundException('Cómic no encontrado');
    const existing = await this.prisma.collectionComic.findUnique({
      where: { collectionId_comicId: { collectionId, comicId } },
    });
    if (existing) throw new ConflictException('El cómic ya está en esta colección');
    return this.prisma.collectionComic.create({
      data: { collectionId, comicId },
      include: { comic: true },
    });
  }

  async removeComic(collectionId: string, userId: string, comicId: string) {
    await this.findOne(collectionId, userId);
    const entry = await this.prisma.collectionComic.findUnique({
      where: { collectionId_comicId: { collectionId, comicId } },
    });
    if (!entry) throw new NotFoundException('El cómic no está en esta colección');
    return this.prisma.collectionComic.delete({
      where: { collectionId_comicId: { collectionId, comicId } },
    });
  }

  async reorderComics(
    collectionId: string,
    userId: string,
    items: { comicId: string; position: number }[],
  ) {
    await this.findOne(collectionId, userId);
    await this.prisma.$transaction(
      items.map(({ comicId, position }) =>
        this.prisma.collectionComic.update({
          where: { collectionId_comicId: { collectionId, comicId } },
          data: { position },
        }),
      ),
    );
    return { ok: true };
  }

  async getSuggestions(collectionId: string, userId: string) {
    await this.findOne(collectionId, userId);

    // Comics already in the collection
    const inCollection = await this.prisma.collectionComic.findMany({
      where: { collectionId },
      select: { comicId: true, comic: { select: { series: true, publisher: true } } },
    });
    const inCollectionIds = new Set(inCollection.map((c) => c.comicId));

    // Gather series/publisher signals from the collection
    const seriesSet = new Set(
      inCollection.map((c) => c.comic.series).filter(Boolean),
    );
    const publisherSet = new Set(
      inCollection.map((c) => c.comic.publisher).filter(Boolean),
    );

    // All user's library comics NOT already in this collection
    const library = await this.prisma.userComic.findMany({
      where: { userId },
      include: {
        comic: {
          include: { tags: { include: { tag: true } } },
        },
      },
    });

    // Tags in the collection
    const collectionComicsWithTags = await this.prisma.collectionComic.findMany({
      where: { collectionId },
      include: { comic: { include: { tags: { include: { tag: true } } } } },
    });
    const tagSet = new Set(
      collectionComicsWithTags.flatMap((cc) =>
        cc.comic.tags.map((t) => t.tag.slug),
      ),
    );

    // Score each candidate
    type Candidate = {
      comicId: string;
      score: number;
      comic: (typeof library)[0]['comic'];
    };

    const candidates: Candidate[] = library
      .filter((uc) => !inCollectionIds.has(uc.comicId))
      .map((uc) => {
        let score = 0;
        if (uc.comic.series && seriesSet.has(uc.comic.series)) score += 3;
        if (uc.comic.publisher && publisherSet.has(uc.comic.publisher)) score += 2;
        const comicTagSlugs = uc.comic.tags.map((t) => t.tag.slug);
        score += comicTagSlugs.filter((s) => tagSet.has(s)).length;
        return { comicId: uc.comicId, score, comic: uc.comic };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return candidates.map(({ comicId, score, comic }) => ({
      comicId,
      score,
      comic,
    }));
  }

  async create(userId: string, dto: CreateCollectionDto) {
    return this.prisma.collection.create({
      data: { ...dto, userId },
      include: { _count: { select: { comics: true } } },
    });
  }

  async update(id: string, userId: string, dto: UpdateCollectionDto) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId)
      throw new ForbiddenException('No puedes modificar esta colección');
    return this.prisma.collection.update({
      where: { id },
      data: dto,
      include: { _count: { select: { comics: true } } },
    });
  }

  async remove(id: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId)
      throw new ForbiddenException('No puedes eliminar esta colección');
    return this.prisma.collection.delete({ where: { id } });
  }

  async exportCollection(id: string, userId: string, format: 'csv' | 'json') {
    const collection = await this.findOne(id, userId);
    const entries = await this.prisma.collectionComic.findMany({
      where: { collectionId: id },
      include: { comic: true },
      orderBy: [{ position: 'asc' }, { addedAt: 'desc' }],
    });

    const rows = entries.map(({ comic, position, addedAt }) => ({
      position: position ?? '',
      title: comic.title,
      series: comic.series ?? '',
      issueNumber: comic.issueNumber ?? '',
      publisher: comic.publisher ?? '',
      year: comic.year ?? '',
      isbn: comic.isbn ?? '',
      binding: comic.binding ?? '',
      drawingStyle: comic.drawingStyle ?? '',
      coverUrl: comic.coverUrl ?? '',
      addedAt: new Date(addedAt).toISOString().slice(0, 10),
    }));

    if (format === 'json') {
      return {
        collection: collection.name,
        exportedAt: new Date().toISOString(),
        total: rows.length,
        comics: rows,
      };
    }

    // CSV
    const headers = Object.keys(rows[0] ?? {}).join(',');
    const lines = rows.map((r) =>
      Object.values(r)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return [headers, ...lines].join('\n');
  }
}
