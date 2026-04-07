import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
  | 'OWNED'
  | 'READ'
  | 'WISHLIST'
  | 'FAVORITE'
  | 'LOANED'
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
        { comic: { series: 'asc' } },
        { comic: { title: 'asc' } },
        { comic: { issueNumber: 'asc' } },
      ];
  }
}

function buildStatusWhere(
  status: StatusFilter | undefined,
): Prisma.UserComicWhereInput {
  switch (status) {
    case 'OWNED':
      return { isOwned: true };
    case 'READ':
      return { isRead: true };
    case 'WISHLIST':
      return { isWishlist: true };
    case 'FAVORITE':
      return { isFavorite: true };
    case 'LOANED':
      return { isLoaned: true };
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
      searchBy?: 'title' | 'author' | 'publisher';
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
        comicFilter['OR'] = [
          { title: { contains: q, mode: 'insensitive' } },
          { series: { contains: q, mode: 'insensitive' } },
        ];
      } else if (searchBy === 'author') {
        comicFilter['authors'] = { contains: q, mode: 'insensitive' };
      } else if (searchBy === 'publisher') {
        comicFilter['publisher'] = { contains: q, mode: 'insensitive' };
      } else {
        comicFilter['OR'] = [
          { title: { contains: q, mode: 'insensitive' } },
          { series: { contains: q, mode: 'insensitive' } },
          { publisher: { contains: q, mode: 'insensitive' } },
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
        isOwned: dto.isOwned ?? true,
        isRead: dto.isRead ?? false,
        isWishlist: dto.isWishlist ?? false,
        isFavorite: dto.isFavorite ?? false,
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

  async removeBulk(userId: string, comicIds: string[]): Promise<{ deleted: number }> {
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
      include: { comic: true },
      orderBy: [{ comic: { series: 'asc' } }, { comic: { title: 'asc' } }],
    });

    const rows = entries.map((uc) => ({
      title: uc.comic.title,
      series: uc.comic.series ?? '',
      issueNumber: uc.comic.issueNumber ?? '',
      publisher: uc.comic.publisher ?? '',
      year: uc.comic.year ?? '',
      isbn: uc.comic.isbn ?? '',
      binding: uc.comic.binding ?? '',
      isOwned: uc.isOwned,
      isRead: uc.isRead,
      isWishlist: uc.isWishlist,
      isFavorite: uc.isFavorite,
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

  async getSeriesView(
    userId: string,
    filters?: { status?: StatusFilter; q?: string },
  ) {
    const { status, q } = filters ?? {};
    const comicFilter: Record<string, unknown> = {};
    if (q) {
      comicFilter['OR'] = [
        { title: { contains: q, mode: 'insensitive' } },
        { series: { contains: q, mode: 'insensitive' } },
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
          include: { seriesRef: true },
        },
      },
      orderBy: [
        { comic: { series: 'asc' } },
        { comic: { issueNumber: 'asc' } },
      ],
    });

    // Group by seriesId (linked) or series string (unlinked)
    const groups = new Map<
      string,
      {
        seriesId: string | null;
        gcdSeriesId: number | null;
        seriesName: string;
        publisher: string | null;
        coverUrl: string | null;
        totalCount: number | null;
        isOngoing: boolean | null;
        comics: typeof entries;
      }
    >();

    for (const entry of entries) {
      const { comic } = entry;
      const key = comic.seriesId ?? comic.series ?? '__no_series__';

      if (!groups.has(key)) {
        const ref = comic.seriesRef;
        groups.set(key, {
          seriesId: comic.seriesId ?? null,
          gcdSeriesId: ref?.gcdSeriesId ?? null,
          seriesName: ref?.name ?? comic.series ?? 'Sin serie',
          publisher: ref?.publisher ?? comic.publisher ?? null,
          coverUrl: ref?.coverUrl ?? comic.coverUrl ?? null,
          totalCount: ref?.totalIssues ?? null,
          isOngoing: ref ? ref.isOngoing : null,
          comics: [],
        });
      }
      groups.get(key)!.comics.push(entry);
    }

    return Array.from(groups.values()).map((g) => ({
      seriesId: g.seriesId,
      gcdSeriesId: g.gcdSeriesId,
      seriesName: g.seriesName,
      publisher: g.publisher,
      coverUrl: g.coverUrl,
      totalCount: g.totalCount,
      isOngoing: g.isOngoing,
      ownedCount: g.comics.filter((e) => e.isOwned).length,
      comicCount: g.comics.length,
      comics: g.comics,
    }));
  }

  async addByIsbn(
    userId: string,
    isbn: string,
    opts?: { isOwned?: boolean; isWishlist?: boolean },
  ) {
    const book = await this.isbndb.getBook(isbn);
    const externalId = `isbndb-${book.isbn13 ?? book.isbn}`;

    // Find or create the Comic record
    let comic = await this.prisma.comic.findFirst({
      where: { externalId, externalApi: 'isbndb' },
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
          externalId,
          externalApi: 'isbndb',
          isbn: book.isbn13 ?? book.isbn,
          authors: book.authors?.join(', ') || undefined,
          metadata: {
            authors: book.authors,
            pageCount: book.pages,
            subjects: book.subjects,
            binding: book.binding,
            language: book.language,
            edition: book.edition,
            titleLong: book.title_long,
          },
        },
      });
    }

    const existing = await this.prisma.userComic.findUnique({
      where: { userId_comicId: { userId, comicId: comic.id } },
    });
    if (existing)
      throw new ConflictException('El cómic ya está en tu biblioteca');

    const userComic = await this.prisma.userComic.create({
      data: {
        userId,
        comicId: comic.id,
        isOwned: opts?.isOwned ?? true,
        isWishlist: opts?.isWishlist ?? false,
      },
      include: { comic: true },
    });

    return userComic;
  }

  async getStats(userId: string) {
    const [total, owned, read, wishlist, favorite, loaned, avgRating] =
      await Promise.all([
        this.prisma.userComic.count({ where: { userId } }),
        this.prisma.userComic.count({ where: { userId, isOwned: true } }),
        this.prisma.userComic.count({ where: { userId, isRead: true } }),
        this.prisma.userComic.count({ where: { userId, isWishlist: true } }),
        this.prisma.userComic.count({ where: { userId, isFavorite: true } }),
        this.prisma.userComic.count({ where: { userId, isLoaned: true } }),
        this.prisma.userComic.aggregate({
          where: { userId, rating: { not: null } },
          _avg: { rating: true },
          _count: { rating: true },
        }),
      ]);

    return {
      total,
      byStatus: {
        OWNED: owned,
        READ: read,
        WISHLIST: wishlist,
        FAVORITE: favorite,
      },
      loaned,
      totalRated: avgRating._count.rating,
      averageRating: avgRating._avg.rating
        ? Math.round(avgRating._avg.rating * 10) / 10
        : null,
    };
  }
}
