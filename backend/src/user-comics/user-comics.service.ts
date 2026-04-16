import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  Prisma,
  CollectionStatus,
  ReadStatus,
  SaleStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { IsbndbService } from '../isbndb/isbndb.service';
import { AddComicDto } from './dto/add-comic.dto';
import { UpdateUserComicDto } from './dto/update-user-comic.dto';

export type SortBy =
  | 'series_asc'
  | 'title_asc'
  | 'year_asc'
  | 'added_desc'
  | 'rating_desc';

export type StatusFilter =
  | 'IN_COLLECTION'
  | 'WISHLIST'
  | 'LOANED'
  | 'READ'
  | 'READING'
  | 'TO_READ'
  | 'FOR_SALE'
  | 'TO_SELL'
  | 'SOLD'
  | 'ALL';

function buildOrderBy(
  sortBy: SortBy,
): Prisma.UserComicOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'title_asc':
      return [{ comic: { title: 'asc' } }, { comic: { issueNumber: 'asc' } }];
    case 'year_asc':
      return [{ comic: { year: 'asc' } }, { comic: { title: 'asc' } }];
    case 'added_desc':
      return [{ addedAt: 'desc' }];
    case 'rating_desc':
      return [{ rating: 'desc' }, { comic: { title: 'asc' } }];
    case 'series_asc':
    default:
      return [
        { comic: { collectionSeries: { name: 'asc' } } },
        { comic: { title: 'asc' } },
        { comic: { issueNumber: 'asc' } },
      ];
  }
}

function buildStatusWhere(
  status: StatusFilter | undefined,
): Prisma.UserComicWhereInput {
  switch (status) {
    // Group 1 — Collection
    case 'IN_COLLECTION':
      return { collectionStatus: CollectionStatus.IN_COLLECTION };
    case 'WISHLIST':
      return { collectionStatus: CollectionStatus.WISHLIST };
    case 'LOANED':
      return { collectionStatus: CollectionStatus.LOANED };
    // Group 2 — Reading
    case 'READ':
      return { readStatus: ReadStatus.READ };
    case 'READING':
      return { readStatus: ReadStatus.READING };
    case 'TO_READ':
      return { readStatus: ReadStatus.TO_READ };
    // Group 3 — Sale
    case 'FOR_SALE':
      return { saleStatus: SaleStatus.FOR_SALE };
    case 'TO_SELL':
      return { saleStatus: SaleStatus.TO_SELL };
    case 'SOLD':
      return { saleStatus: SaleStatus.SOLD };
    default:
      return {};
  }
}

@Injectable()
export class UserComicsService {
  private readonly logger = new Logger(UserComicsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly isbndb: IsbndbService,
  ) {}

  async findAll(
    userId: string,
    filters?: {
      status?: StatusFilter;
      sortBy?: SortBy;
      page?: number;
      limit?: number;
      q?: string;
      searchBy?: 'title' | 'authors' | 'scriptwriter' | 'artist' | 'publisher';
      tag?: string;
      publisher?: string;
      yearFrom?: string;
      yearTo?: string;
    },
  ) {
    const {
      status,
      sortBy = 'series_asc',
      page = 1,
      limit = 20,
      q,
      searchBy,
      tag,
      publisher,
      yearFrom,
      yearTo,
    } = filters ?? {};
    const skip = (page - 1) * limit;
    const comicFilter: Record<string, unknown> = {};
    if (q) {
      if (searchBy === 'title') {
        comicFilter['OR'] = [{ title: { contains: q, mode: 'insensitive' } }];
      } else if (searchBy === 'scriptwriter') {
        comicFilter['scriptwriter'] = { contains: q, mode: 'insensitive' };
      } else if (searchBy === 'artist') {
        comicFilter['artist'] = { contains: q, mode: 'insensitive' };
      } else if (searchBy === 'authors') {
        comicFilter['OR'] = [
          { scriptwriter: { contains: q, mode: 'insensitive' } },
          { artist: { contains: q, mode: 'insensitive' } },
          { authors: { contains: q, mode: 'insensitive' } },
        ];
      } else if (searchBy === 'publisher') {
        comicFilter['publisher'] = { contains: q, mode: 'insensitive' };
      } else {
        comicFilter['OR'] = [
          { title: { contains: q, mode: 'insensitive' } },
          { collectionSeries: { name: { contains: q, mode: 'insensitive' } } },
          { publisher: { contains: q, mode: 'insensitive' } },
          { scriptwriter: { contains: q, mode: 'insensitive' } },
          { artist: { contains: q, mode: 'insensitive' } },
          { authors: { contains: q, mode: 'insensitive' } },
        ];
      }
    }
    if (publisher)
      comicFilter['publisher'] = { contains: publisher, mode: 'insensitive' };
    const yearFromNum = yearFrom ? parseInt(yearFrom, 10) : undefined;
    const yearToNum = yearTo ? parseInt(yearTo, 10) : undefined;
    if (yearFromNum || yearToNum) {
      comicFilter['year'] = {
        ...(yearFromNum && { gte: yearFromNum }),
        ...(yearToNum && { lte: yearToNum }),
      };
    }
    if (tag) comicFilter['tags'] = { some: { tag: { slug: tag } } };
    const where: Prisma.UserComicWhereInput = {
      userId,
      ...buildStatusWhere(status),
      ...(Object.keys(comicFilter).length > 0 && {
        comic: comicFilter as Prisma.ComicWhereInput,
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.userComic.findMany({
        where,
        skip,
        take: limit,
        include: { comic: { include: { tags: { include: { tag: true } } } } },
        orderBy: buildOrderBy(sortBy),
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
        collectionStatus:
          dto.collectionStatus ?? CollectionStatus.IN_COLLECTION,
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

    const data: Prisma.UserComicUpdateInput = {};

    if (dto.readStatus !== undefined) data.readStatus = dto.readStatus;
    if (dto.loanedTo !== undefined) data.loanedTo = dto.loanedTo;
    if (dto.rating !== undefined) data.rating = dto.rating;
    if (dto.notes !== undefined) data.notes = dto.notes;

    if (dto.saleStatus !== undefined) {
      data.saleStatus = dto.saleStatus;
      // VENDIDO es exclusivo con tener un estado de colección
      if (dto.saleStatus === SaleStatus.SOLD) {
        data.collectionStatus = null;
      }
    }

    if (dto.collectionStatus !== undefined) {
      data.collectionStatus = dto.collectionStatus;
      // Si se re-adquiere un cómic marcado como VENDIDO, limpiar VENDIDO
      if (
        dto.collectionStatus !== null &&
        entry.saleStatus === SaleStatus.SOLD
      ) {
        data.saleStatus = null;
      }
    }

    return this.prisma.userComic.update({
      where: { userId_comicId: { userId, comicId } },
      data,
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

  async removeBulk(
    userId: string,
    comicIds: string[],
  ): Promise<{ deleted: number }> {
    const result = await this.prisma.userComic.deleteMany({
      where: { userId, comicId: { in: comicIds } },
    });
    return { deleted: result.count };
  }

  async findByComicId(userId: string, comicId: string) {
    return this.prisma.userComic.findUnique({
      where: { userId_comicId: { userId, comicId } },
    });
  }

  async exportLibrary(userId: string, format: 'csv' | 'json'): Promise<string> {
    const entries = await this.prisma.userComic.findMany({
      where: { userId },
      include: { comic: { include: { collectionSeries: true } } },
      orderBy: [
        { comic: { collectionSeries: { name: 'asc' } } },
        { comic: { title: 'asc' } },
      ],
    });

    const rows = entries.map((uc) => ({
      title: uc.comic.title,
      serie: uc.comic.collectionSeries?.name ?? '',
      issueNumber: uc.comic.issueNumber ?? '',
      publisher: uc.comic.publisher ?? '',
      year: uc.comic.year ?? '',
      isbn: uc.comic.isbn ?? '',
      binding: uc.comic.binding ?? '',
      collectionStatus: uc.collectionStatus ?? '',
      readStatus: uc.readStatus ?? '',
      saleStatus: uc.saleStatus ?? '',
      loanedTo: uc.loanedTo ?? '',
      rating: uc.rating ?? '',
      notes: uc.notes ?? '',
      addedAt: uc.addedAt.toISOString(),
    }));

    if (format === 'json') {
      return JSON.stringify(rows, null, 2);
    }

    const headers = Object.keys(rows[0] ?? {});
    const csvRows = rows.map((row) =>
      headers
        .map(
          (h) => `"${String(row[h as keyof typeof row]).replace(/"/g, '""')}"`,
        )
        .join(','),
    );
    return [headers.join(','), ...csvRows].join('\n');
  }

  async reorderSeries(
    userId: string,
    collectionSeriesId: string,
    positions: { comicId: string; position: number }[],
  ): Promise<{ updated: number }> {
    await Promise.all(
      positions.map(({ comicId, position }) =>
        this.prisma.userComic.updateMany({
          where: { userId, comicId, comic: { collectionSeriesId } },
          data: { seriesPosition: position },
        }),
      ),
    );
    return { updated: positions.length };
  }

  async getSeriesDetail(userId: string, collectionSeriesId: string) {
    const [series, userComics] = await Promise.all([
      this.prisma.collectionSeries.findUnique({
        where: { id: collectionSeriesId },
        include: { collection: { select: { id: true, name: true } } },
      }),
      this.prisma.userComic.findMany({
        where: { userId, comic: { collectionSeriesId } },
        include: { comic: { include: { collectionSeries: true } } },
        orderBy: { comic: { issueNumber: 'asc' } },
      }),
    ]);

    if (!series) {
      throw new NotFoundException(
        `CollectionSeries ${collectionSeriesId} not found`,
      );
    }

    const ownedCount = userComics.filter(
      (e) => e.collectionStatus === CollectionStatus.IN_COLLECTION,
    ).length;

    const coverUrl =
      userComics.find((e) => e.comic.coverUrl)?.comic.coverUrl ?? null;
    const publisher =
      userComics.find((e) => e.comic.publisher)?.comic.publisher ?? null;

    return {
      collectionSeriesId: series.id,
      seriesName: series.name,
      collectionId: series.collectionId,
      collectionName: series.collection.name,
      totalVolumes: series.totalVolumes ?? null,
      ownedCount,
      comicCount: userComics.length,
      coverUrl,
      publisher,
      comics: userComics,
    };
  }

  async getSeriesView(
    userId: string,
    filters?: { status?: StatusFilter; q?: string },
  ) {
    const { status, q } = filters ?? {};
    const comicFilter: Record<string, unknown> = {};
    if (q) {
      comicFilter['OR'] = [
        { title: { contains: q, mode: 'insensitive' } },
        { collectionSeries: { name: { contains: q, mode: 'insensitive' } } },
        { publisher: { contains: q, mode: 'insensitive' } },
        { authors: { contains: q, mode: 'insensitive' } },
      ];
    }

    const entries = await this.prisma.userComic.findMany({
      where: {
        userId,
        ...buildStatusWhere(status),
        ...(Object.keys(comicFilter).length > 0 && {
          comic: comicFilter as Prisma.ComicWhereInput,
        }),
      },
      include: {
        comic: {
          include: { collectionSeries: true },
        },
      },
      orderBy: [
        { comic: { collectionSeries: { name: 'asc' } } },
        { comic: { issueNumber: 'asc' } },
      ],
    });

    // Group by collectionSeriesId (serie asignada) o '__no_series__' (libre)
    const groups = new Map<
      string,
      {
        collectionSeriesId: string | null;
        seriesName: string;
        collectionId: string | null;
        coverUrl: string | null;
        totalCount: number | null;
        comics: typeof entries;
      }
    >();

    for (const entry of entries) {
      const { comic } = entry;
      const key = comic.collectionSeriesId ?? '__no_series__';

      if (!groups.has(key)) {
        groups.set(key, {
          collectionSeriesId: comic.collectionSeriesId ?? null,
          seriesName: comic.collectionSeries?.name ?? 'Sin serie',
          collectionId: comic.collectionSeries?.collectionId ?? null,
          coverUrl: comic.coverUrl ?? null,
          totalCount: comic.collectionSeries?.totalVolumes ?? null,
          comics: [],
        });
      }
      groups.get(key)!.comics.push(entry);
    }

    return Array.from(groups.values()).map((g) => ({
      collectionSeriesId: g.collectionSeriesId,
      seriesName: g.seriesName,
      collectionId: g.collectionId,
      coverUrl: g.coverUrl,
      totalCount: g.totalCount,
      ownedCount: g.comics.filter(
        (e) => e.collectionStatus === CollectionStatus.IN_COLLECTION,
      ).length,
      comicCount: g.comics.length,
      comics: g.comics,
    }));
  }

  async addByIsbn(
    userId: string,
    isbnInput: string,
    opts?: { collectionStatus?: CollectionStatus },
  ) {
    const book = await this.isbndb.getBook(isbnInput);
    const isbn = book.isbn13 ?? book.isbn;

    let comic = await this.prisma.comic.findFirst({
      where: { isbn },
    });

    if (!comic) {
      const rawYear = book.date_published
        ? parseInt(book.date_published.slice(0, 4), 10)
        : undefined;
      const year =
        rawYear !== undefined && !isNaN(rawYear) ? rawYear : undefined;

      comic = await this.prisma.comic.create({
        data: {
          title: book.title,
          publisher: book.publisher,
          year,
          synopsis: book.synopsis ?? book.overview,
          coverUrl: book.image,
          isbn,
          authors: book.authors?.join(', ') || undefined,
        },
      });
    }

    const existing = await this.prisma.userComic.findUnique({
      where: { userId_comicId: { userId, comicId: comic.id } },
    });
    if (existing)
      throw new ConflictException('El cómic ya está en tu biblioteca');

    return this.prisma.userComic.create({
      data: {
        userId,
        comicId: comic.id,
        collectionStatus:
          opts?.collectionStatus ?? CollectionStatus.IN_COLLECTION,
      },
      include: { comic: true },
    });
  }

  async getStats(userId: string) {
    const [
      total,
      inCollection,
      wishlist,
      loaned,
      read,
      reading,
      toRead,
      avgRating,
      allComics,
    ] = await Promise.all([
      this.prisma.userComic.count({ where: { userId } }),
      this.prisma.userComic.count({
        where: { userId, collectionStatus: CollectionStatus.IN_COLLECTION },
      }),
      this.prisma.userComic.count({
        where: { userId, collectionStatus: CollectionStatus.WISHLIST },
      }),
      this.prisma.userComic.count({
        where: { userId, collectionStatus: CollectionStatus.LOANED },
      }),
      this.prisma.userComic.count({
        where: { userId, readStatus: ReadStatus.READ },
      }),
      this.prisma.userComic.count({
        where: { userId, readStatus: ReadStatus.READING },
      }),
      this.prisma.userComic.count({
        where: { userId, readStatus: ReadStatus.TO_READ },
      }),
      this.prisma.userComic.aggregate({
        where: { userId, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      this.prisma.userComic.findMany({
        where: { userId },
        select: { comic: { select: { collectionSeriesId: true } } },
      }),
    ]);

    const seriesKeys = new Set<string>();
    for (const uc of allComics) {
      if (uc.comic.collectionSeriesId)
        seriesKeys.add(uc.comic.collectionSeriesId);
    }

    return {
      total,
      seriesCount: seriesKeys.size,
      byStatus: {
        IN_COLLECTION: inCollection,
        WISHLIST: wishlist,
        LOANED: loaned,
        READ: read,
        READING: reading,
        TO_READ: toRead,
      },
      totalRated: avgRating._count.rating,
      averageRating: avgRating._avg.rating
        ? Math.round(avgRating._avg.rating * 10) / 10
        : null,
    };
  }

  async importLibrary(
    userId: string,
    csvString: string,
  ): Promise<{ imported: number; skipped: number }> {
    const lines = csvString
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) return { imported: 0, skipped: 0 };

    const headers = lines[0]
      .split(',')
      .map((h) => h.replace(/^"|"$/g, '').trim());
    let imported = 0;
    let skipped = 0;

    for (const line of lines.slice(1)) {
      try {
        // Parse CSV row handling quoted values
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          if (line[i] === '"') {
            if (inQuotes && line[i + 1] === '"') {
              current += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (line[i] === ',' && !inQuotes) {
            values.push(current);
            current = '';
          } else {
            current += line[i];
          }
        }
        values.push(current);

        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          row[h] = values[i] ?? '';
        });

        const title = row['title']?.trim();
        if (!title) {
          skipped++;
          continue;
        }

        // Find or create comic
        let comic = row['isbn']
          ? await this.prisma.comic.findFirst({ where: { isbn: row['isbn'] } })
          : null;

        if (!comic) {
          const year = row['year'] ? parseInt(row['year'], 10) : undefined;
          comic = await this.prisma.comic.create({
            data: {
              title,
              issueNumber: row['issueNumber'] || undefined,
              publisher: row['publisher'] || undefined,
              year: year && !isNaN(year) ? year : undefined,
              isbn: row['isbn'] || undefined,
              binding:
                (row['binding'] as import('@prisma/client').BindingFormat) ||
                undefined,
            },
          });
        }

        // Upsert UserComic
        const collectionStatus = Object.values(CollectionStatus).includes(
          row['collectionStatus'] as CollectionStatus,
        )
          ? (row['collectionStatus'] as CollectionStatus)
          : undefined;

        const readStatus = Object.values(ReadStatus).includes(
          row['readStatus'] as ReadStatus,
        )
          ? (row['readStatus'] as ReadStatus)
          : undefined;

        const rating = row['rating'] ? parseInt(row['rating'], 10) : undefined;

        await this.prisma.userComic.upsert({
          where: { userId_comicId: { userId, comicId: comic.id } },
          create: {
            userId,
            comicId: comic.id,
            collectionStatus:
              collectionStatus ?? CollectionStatus.IN_COLLECTION,
            readStatus,
            rating: rating && !isNaN(rating) ? rating : undefined,
            notes: row['notes'] || undefined,
            loanedTo: row['loanedTo'] || undefined,
          },
          update: {
            collectionStatus:
              collectionStatus ?? CollectionStatus.IN_COLLECTION,
            readStatus,
            rating: rating && !isNaN(rating) ? rating : undefined,
            notes: row['notes'] || undefined,
          },
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    return { imported, skipped };
  }
}
