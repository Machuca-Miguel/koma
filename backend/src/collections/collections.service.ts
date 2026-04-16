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

  // Calcula el rango de años de los cómics de cada colección
  private async attachYearRange<T extends { id: string }>(collections: T[]) {
    if (!collections.length) return collections.map((col) => ({ ...col, yearRange: null }));

    const ids = collections.map((c) => c.id);

    const comics = await this.prisma.comic.findMany({
      where: {
        collectionSeries: { collectionId: { in: ids } },
        year: { not: null },
      },
      select: { year: true, collectionSeries: { select: { collectionId: true } } },
    });

    const yearMap = new Map<string, { min: number; max: number }>();
    for (const comic of comics) {
      if (!comic.year || !comic.collectionSeries) continue;
      const collectionId = comic.collectionSeries.collectionId;
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
        series: {
          include: {
            _count: { select: { comics: true } },
            comics: {
              take: 2,
              orderBy: { createdAt: 'desc' },
              select: { coverUrl: true },
            },
          },
        },
      },
    });

    const withRange = await this.attachYearRange(collections);

    return withRange.map(({ series, ...col }) => {
      const comicsCount = series.reduce((sum, s) => sum + s._count.comics, 0);
      const previewCovers = series
        .flatMap((s) => s.comics.map((c) => c.coverUrl))
        .filter((url): url is string => !!url)
        .slice(0, 4);
      return { ...col, _count: { comics: comicsCount }, previewCovers };
    });
  }

  async findOne(id: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId && !collection.isPublic)
      throw new ForbiddenException('No tienes acceso a esta colección');
    const [withRange] = await this.attachYearRange([collection]);
    return withRange;
  }

  // Devuelve todos los cómics de una colección (vía sus series)
  async findComics(collectionId: string, userId: string) {
    await this.findOne(collectionId, userId);
    const comics = await this.prisma.comic.findMany({
      where: { collectionSeries: { collectionId } },
      include: {
        tags: { include: { tag: true } },
        collectionSeries: true,
        userComics: {
          where: { userId },
          select: {
            collectionStatus: true,
            readStatus: true,
            saleStatus: true,
            loanedTo: true,
            rating: true,
          },
          take: 1,
        },
      },
      orderBy: [{ collectionSeries: { name: 'asc' } }, { issueNumber: 'asc' }],
    });

    return comics.map(({ userComics, ...comic }) => ({
      comic,
      userStatus: userComics[0] ?? null,
    }));
  }

  // Añade un cómic a la serie "Principal" de la colección
  async addComic(collectionId: string, userId: string, comicId: string) {
    await this.findOne(collectionId, userId);
    const comic = await this.prisma.comic.findUnique({ where: { id: comicId } });
    if (!comic) throw new NotFoundException('Cómic no encontrado');

    // Un cómic solo puede pertenecer a una serie
    if (comic.collectionSeriesId) {
      throw new ConflictException('El cómic ya pertenece a una serie');
    }

    const defaultSeries = await this.prisma.collectionSeries.findFirst({
      where: { collectionId, isDefault: true },
    });
    if (!defaultSeries) throw new NotFoundException('Serie principal no encontrada');

    return this.prisma.comic.update({
      where: { id: comicId },
      data: { collectionSeriesId: defaultSeries.id },
      include: { collectionSeries: true },
    });
  }

  // Desvincula un cómic de su serie (lo deja libre)
  async removeComic(collectionId: string, userId: string, comicId: string) {
    await this.findOne(collectionId, userId);
    const comic = await this.prisma.comic.findFirst({
      where: { id: comicId, collectionSeries: { collectionId } },
    });
    if (!comic) throw new NotFoundException('El cómic no está en esta colección');
    return this.prisma.comic.update({
      where: { id: comicId },
      data: { collectionSeriesId: null },
    });
  }

  // Sugiere cómics de la biblioteca del usuario para añadir a la colección
  async getSuggestions(collectionId: string, userId: string) {
    await this.findOne(collectionId, userId);

    const inCollectionComics = await this.prisma.comic.findMany({
      where: { collectionSeries: { collectionId } },
      select: {
        id: true,
        publisher: true,
        tags: { include: { tag: true } },
      },
    });
    const inCollectionIds = new Set(inCollectionComics.map((c) => c.id));
    const publisherSet = new Set(
      inCollectionComics.map((c) => c.publisher).filter(Boolean) as string[],
    );
    const tagSet = new Set(
      inCollectionComics.flatMap((c) => c.tags.map((t) => t.tag.slug)),
    );

    const library = await this.prisma.userComic.findMany({
      where: { userId },
      include: { comic: { include: { tags: { include: { tag: true } } } } },
    });

    const candidates = library
      .filter((uc) => !inCollectionIds.has(uc.comicId))
      .map((uc) => {
        let score = 0;
        if (uc.comic.publisher && publisherSet.has(uc.comic.publisher)) score += 2;
        score += uc.comic.tags.filter((t) => tagSet.has(t.tag.slug)).length;
        return { comicId: uc.comicId, score, comic: uc.comic };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return candidates;
  }

  async create(userId: string, dto: CreateCollectionDto) {
    const collection = await this.prisma.collection.create({
      data: { ...dto, userId },
    });
    // Auto-crear serie "Principal" por defecto
    await this.prisma.collectionSeries.create({
      data: { name: 'Principal', collectionId: collection.id, isDefault: true, position: 0 },
    });
    return collection;
  }

  async update(id: string, userId: string, dto: UpdateCollectionDto) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId)
      throw new ForbiddenException('No puedes modificar esta colección');
    return this.prisma.collection.update({ where: { id }, data: dto });
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
    const comics = await this.prisma.comic.findMany({
      where: { collectionSeries: { collectionId: id } },
      include: { collectionSeries: true },
      orderBy: [{ collectionSeries: { name: 'asc' } }, { issueNumber: 'asc' }],
    });

    const rows = comics.map((comic) => ({
      serie: comic.collectionSeries?.name ?? '',
      title: comic.title,
      issueNumber: comic.issueNumber ?? '',
      publisher: comic.publisher ?? '',
      year: comic.year ?? '',
      isbn: comic.isbn ?? '',
      binding: comic.binding ?? '',
      drawingStyle: comic.drawingStyle ?? '',
      coverUrl: comic.coverUrl ?? '',
    }));

    if (format === 'json') {
      return {
        collection: collection.name,
        exportedAt: new Date().toISOString(),
        total: rows.length,
        comics: rows,
      };
    }

    const headers = Object.keys(rows[0] ?? {}).join(',');
    const lines = rows.map((r) =>
      Object.values(r)
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    return [headers, ...lines].join('\n');
  }
}
