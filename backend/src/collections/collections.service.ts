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

  // Calcula el rango de años de los cómics de cada colección (via UserComic)
  private async attachYearRange<T extends { id: string; userId: string }>(
    collections: T[],
  ) {
    if (!collections.length)
      return collections.map((col) => ({ ...col, yearRange: null }));

    const userComics = await this.prisma.userComic.findMany({
      where: {
        collectionSeries: { collectionId: { in: collections.map((c) => c.id) } },
        comic: { year: { not: null } },
      },
      select: {
        comic: { select: { year: true } },
        collectionSeries: { select: { collectionId: true } },
      },
    });

    const yearMap = new Map<string, { min: number; max: number }>();
    for (const uc of userComics) {
      if (!uc.comic.year || !uc.collectionSeries) continue;
      const collectionId = uc.collectionSeries.collectionId;
      const existing = yearMap.get(collectionId);
      if (!existing) {
        yearMap.set(collectionId, { min: uc.comic.year, max: uc.comic.year });
      } else {
        existing.min = Math.min(existing.min, uc.comic.year);
        existing.max = Math.max(existing.max, uc.comic.year);
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
      include: { series: true },
    });

    // Count comics and get preview covers per series via UserComic
    const collectionIds = collections.map((c) => c.id);

    const userComicsForCovers = await this.prisma.userComic.findMany({
      where: {
        userId,
        collectionSeries: { collectionId: { in: collectionIds } },
        comic: { coverUrl: { not: null } },
      },
      select: {
        comic: { select: { coverUrl: true } },
        collectionSeries: { select: { collectionId: true } },
      },
      take: 400,
    });

    const userComicCounts = await this.prisma.userComic.groupBy({
      by: ['collectionSeriesId'],
      where: {
        userId,
        collectionSeriesId: { not: null },
        collectionSeries: { collectionId: { in: collectionIds } },
      },
      _count: { comicId: true },
    });

    // Build maps indexed by collectionId
    const coverMap = new Map<string, string[]>();
    for (const uc of userComicsForCovers) {
      const colId = uc.collectionSeries?.collectionId;
      if (!colId || !uc.comic.coverUrl) continue;
      if (!coverMap.has(colId)) coverMap.set(colId, []);
      coverMap.get(colId)!.push(uc.comic.coverUrl);
    }

    // Map collectionSeriesId → collectionId
    const allSeries = collections.flatMap((c) => c.series);
    const seriesCollectionMap = new Map<string, string>(
      allSeries.map((s) => [s.id, s.collectionId]),
    );

    const countMap = new Map<string, number>();
    for (const row of userComicCounts) {
      if (!row.collectionSeriesId) continue;
      const colId = seriesCollectionMap.get(row.collectionSeriesId);
      if (!colId) continue;
      countMap.set(colId, (countMap.get(colId) ?? 0) + row._count.comicId);
    }

    const withRange = await this.attachYearRange(
      collections.map((c) => ({ ...c, userId })),
    );

    return withRange.map(({ series, ...col }) => ({
      ...col,
      _count: { comics: countMap.get(col.id) ?? 0, series: series.length },
      previewCovers: (coverMap.get(col.id) ?? []).slice(0, 4),
    }));
  }

  async findOne(id: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId && !collection.isPublic)
      throw new ForbiddenException('No tienes acceso a esta colección');
    const [withRange] = await this.attachYearRange([{ ...collection, userId: collection.userId }]);
    return withRange;
  }

  // Devuelve los cómics del usuario asignados a esta colección (vía UserComic)
  async findComics(collectionId: string, userId: string) {
    await this.findOne(collectionId, userId);

    const userComics = await this.prisma.userComic.findMany({
      where: {
        userId,
        collectionSeries: { collectionId },
      },
      include: {
        comic: {
          include: { tags: { include: { tag: true } } },
        },
        collectionSeries: true,
      },
      orderBy: [
        { collectionSeries: { name: 'asc' } },
        { comic: { issueNumber: 'asc' } },
      ],
    });

    return userComics.map((uc) => ({
      comic: {
        ...uc.comic,
        collectionSeriesId: uc.collectionSeriesId,
        collectionSeries: uc.collectionSeries,
      },
      userStatus: {
        collectionStatus: uc.collectionStatus,
        readStatus: uc.readStatus,
        saleStatus: uc.saleStatus,
        loanedTo: uc.loanedTo,
        rating: uc.rating,
      },
    }));
  }

  // Asigna un cómic (ya en la biblioteca del usuario) a la serie Principal
  async addComic(collectionId: string, userId: string, comicId: string) {
    await this.findOne(collectionId, userId);

    const userComic = await this.prisma.userComic.findUnique({
      where: { userId_comicId: { userId, comicId } },
    });
    if (!userComic)
      throw new NotFoundException(
        'El cómic no está en tu biblioteca. Añádelo primero.',
      );

    if (userComic.collectionSeriesId) {
      throw new ConflictException('El cómic ya está asignado a una serie');
    }

    const defaultSeries = await this.prisma.collectionSeries.findFirst({
      where: { collectionId, isDefault: true },
    });
    if (!defaultSeries)
      throw new NotFoundException('Serie principal no encontrada');

    return this.prisma.userComic.update({
      where: { userId_comicId: { userId, comicId } },
      data: { collectionSeriesId: defaultSeries.id },
      include: { comic: true, collectionSeries: true },
    });
  }

  // Desvincula el cómic de su serie (lo deja libre en la biblioteca del usuario)
  async removeComic(collectionId: string, userId: string, comicId: string) {
    await this.findOne(collectionId, userId);

    const userComic = await this.prisma.userComic.findFirst({
      where: {
        userId,
        comicId,
        collectionSeries: { collectionId },
      },
    });
    if (!userComic)
      throw new NotFoundException('El cómic no está en esta colección');

    return this.prisma.userComic.update({
      where: { userId_comicId: { userId, comicId } },
      data: { collectionSeriesId: null },
    });
  }

  // Sugiere cómics de la biblioteca del usuario para añadir a la colección
  async getSuggestions(collectionId: string, userId: string) {
    await this.findOne(collectionId, userId);

    const inCollectionUserComics = await this.prisma.userComic.findMany({
      where: { userId, collectionSeries: { collectionId } },
      select: {
        comicId: true,
        comic: {
          select: {
            publisher: true,
            tags: { include: { tag: true } },
          },
        },
      },
    });

    const inCollectionIds = new Set(inCollectionUserComics.map((uc) => uc.comicId));
    const publisherSet = new Set(
      inCollectionUserComics
        .map((uc) => uc.comic.publisher)
        .filter(Boolean) as string[],
    );
    const tagSet = new Set(
      inCollectionUserComics.flatMap((uc) =>
        uc.comic.tags.map((t) => t.tag.slug),
      ),
    );

    const library = await this.prisma.userComic.findMany({
      where: { userId },
      include: { comic: { include: { tags: { include: { tag: true } } } } },
    });

    const candidates = library
      .filter((uc) => !inCollectionIds.has(uc.comicId))
      .map((uc) => {
        let score = 0;
        if (uc.comic.publisher && publisherSet.has(uc.comic.publisher))
          score += 2;
        score += uc.comic.tags.filter((t) => tagSet.has(t.tag.slug)).length;
        return { comicId: uc.comicId, score, comic: uc.comic };
      })
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return candidates;
  }

  async create(userId: string, dto: CreateCollectionDto) {
    const { initialSeriesName, ...collectionData } = dto;
    return this.prisma.$transaction(async (tx) => {
      const collection = await tx.collection.create({
        data: { ...collectionData, userId },
      });
      const series = await tx.collectionSeries.create({
        data: {
          name: initialSeriesName ?? 'Principal',
          collectionId: collection.id,
          isDefault: true,
          position: 0,
        },
      });
      return { collection, series };
    });
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

    const userComics = await this.prisma.userComic.findMany({
      where: {
        userId,
        collectionSeries: { collectionId: id },
      },
      include: { comic: true, collectionSeries: true },
      orderBy: [
        { collectionSeries: { name: 'asc' } },
        { comic: { issueNumber: 'asc' } },
      ],
    });

    const rows = userComics.map((uc) => ({
      serie: uc.collectionSeries?.name ?? '',
      title: uc.comic.title,
      issueNumber: uc.comic.issueNumber ?? '',
      publisher: uc.comic.publisher ?? '',
      year: uc.comic.year ?? '',
      isbn: uc.comic.isbn ?? '',
      binding: uc.comic.binding ?? '',
      drawingStyle: uc.comic.drawingStyle ?? '',
      coverUrl: uc.comic.coverUrl ?? '',
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
