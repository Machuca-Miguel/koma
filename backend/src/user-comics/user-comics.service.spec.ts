/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UserComicsService } from './user-comics.service';
import { PrismaService } from '../prisma/prisma.service';
import { IsbndbService } from '../isbndb/isbndb.service';

const mockPrisma = {
  userComic: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
  comic: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  collectionSeries: {
    findUnique: jest.fn(),
  },
};

const mockIsbndb = {
  getBook: jest.fn(),
};

const MOCK_COMIC = { id: 'comic-1', title: 'Batman #1' };
const MOCK_USER_COMIC = {
  id: 'uc-1',
  userId: 'user-1',
  comicId: 'comic-1',
  collectionStatus: 'IN_COLLECTION',
  readStatus: null,
  saleStatus: null,
  collectionSeriesId: null,
  loanedTo: null,
  rating: 8,
  notes: 'Great issue',
  addedAt: new Date(),
  comic: MOCK_COMIC,
  override: null,
};

describe('UserComicsService', () => {
  let service: UserComicsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserComicsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: IsbndbService, useValue: mockIsbndb },
      ],
    }).compile();

    service = module.get(UserComicsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated library entries', async () => {
      mockPrisma.userComic.findMany.mockResolvedValue([MOCK_USER_COMIC]);
      mockPrisma.userComic.count.mockResolvedValue(1);

      const result = await service.findAll('user-1');

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('filters by IN_COLLECTION status', async () => {
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.count.mockResolvedValue(0);

      await service.findAll('user-1', { status: 'IN_COLLECTION' });

      const whereArg = mockPrisma.userComic.findMany.mock.calls[0][0].where;
      expect(whereArg.collectionStatus).toBe('IN_COLLECTION');
    });

    it('applies correct skip for page 3', async () => {
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.count.mockResolvedValue(0);

      await service.findAll('user-1', { page: 3, limit: 10 });

      expect(mockPrisma.userComic.findMany.mock.calls[0][0].skip).toBe(20);
    });

    it('applies search filter including series name at UserComic level', async () => {
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.count.mockResolvedValue(0);

      await service.findAll('user-1', { q: 'asterix' });

      const whereArg = mockPrisma.userComic.findMany.mock.calls[0][0].where;
      // Search uses OR at UserComic level (comic fields + collectionSeries name)
      expect(whereArg.OR).toBeDefined();
      const comicOrClause = whereArg.OR.find((c: any) => c.comic);
      expect(comicOrClause).toBeDefined();
      expect(comicOrClause.comic.OR[0].title.contains).toBe('asterix');
    });
  });

  describe('add', () => {
    it('adds comic to library', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);
      mockPrisma.userComic.findUnique.mockResolvedValue(null);
      mockPrisma.userComic.create.mockResolvedValue(MOCK_USER_COMIC);

      const result = await service.add('user-1', { comicId: 'comic-1' });
      expect(result).toEqual(MOCK_USER_COMIC);
    });

    it('throws NotFoundException when comic does not exist', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(null);

      await expect(
        service.add('user-1', { comicId: 'bad-id' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when comic already in library', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);
      mockPrisma.userComic.findUnique.mockResolvedValue(MOCK_USER_COMIC);

      await expect(
        service.add('user-1', { comicId: 'comic-1' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('addByIsbn', () => {
    const MOCK_ISBNDB_BOOK = {
      isbn: '9788467400123',
      isbn13: '9788467400123',
      title: 'Astérix el Galo',
      publisher: 'Salvat',
      date_published: '1999',
      image: 'https://example.com/cover.jpg',
    };

    it('creates comic from ISBN and adds to library', async () => {
      mockIsbndb.getBook.mockResolvedValue(MOCK_ISBNDB_BOOK);
      mockPrisma.comic.findFirst.mockResolvedValue(null);
      mockPrisma.comic.create.mockResolvedValue(MOCK_COMIC);
      mockPrisma.userComic.findUnique.mockResolvedValue(null);
      mockPrisma.userComic.create.mockResolvedValue(MOCK_USER_COMIC);

      const result = await service.addByIsbn('user-1', '9788467400123');

      expect(mockIsbndb.getBook).toHaveBeenCalledWith('9788467400123');
      expect(mockPrisma.comic.create).toHaveBeenCalled();
      expect(result).toEqual(MOCK_USER_COMIC);
    });

    it('reuses existing comic if already imported', async () => {
      mockIsbndb.getBook.mockResolvedValue(MOCK_ISBNDB_BOOK);
      mockPrisma.comic.findFirst.mockResolvedValue(MOCK_COMIC);
      mockPrisma.userComic.findUnique.mockResolvedValue(null);
      mockPrisma.userComic.create.mockResolvedValue(MOCK_USER_COMIC);

      await service.addByIsbn('user-1', '9788467400123');

      expect(mockPrisma.comic.create).not.toHaveBeenCalled();
      expect(mockPrisma.userComic.create).toHaveBeenCalled();
    });

    it('throws ConflictException if comic already in library', async () => {
      mockIsbndb.getBook.mockResolvedValue(MOCK_ISBNDB_BOOK);
      mockPrisma.comic.findFirst.mockResolvedValue(MOCK_COMIC);
      mockPrisma.userComic.findUnique.mockResolvedValue(MOCK_USER_COMIC);

      await expect(
        service.addByIsbn('user-1', '9788467400123'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates library entry', async () => {
      mockPrisma.userComic.findUnique.mockResolvedValue(MOCK_USER_COMIC);
      mockPrisma.userComic.update.mockResolvedValue({
        ...MOCK_USER_COMIC,
        rating: 10,
      });

      const result = await service.update('user-1', 'comic-1', { rating: 10 });
      expect(result.rating).toBe(10);
    });

    it('throws NotFoundException when entry not in library', async () => {
      mockPrisma.userComic.findUnique.mockResolvedValue(null);

      await expect(service.update('user-1', 'comic-1', {})).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.userComic.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes library entry', async () => {
      mockPrisma.userComic.findUnique.mockResolvedValue(MOCK_USER_COMIC);
      mockPrisma.userComic.delete.mockResolvedValue(MOCK_USER_COMIC);

      await service.remove('user-1', 'comic-1');
      expect(mockPrisma.userComic.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when entry not found', async () => {
      mockPrisma.userComic.findUnique.mockResolvedValue(null);

      await expect(service.remove('user-1', 'comic-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.userComic.delete).not.toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('returns stats with status counts and average rating', async () => {
      mockPrisma.userComic.count
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(10) // IN_COLLECTION
        .mockResolvedValueOnce(3)  // WISHLIST
        .mockResolvedValueOnce(1)  // LOANED
        .mockResolvedValueOnce(5)  // READ
        .mockResolvedValueOnce(2)  // READING
        .mockResolvedValueOnce(4); // TO_READ
      mockPrisma.userComic.aggregate.mockResolvedValue({
        _avg: { rating: 8.4 },
        _count: { rating: 7 },
      });
      mockPrisma.userComic.findMany.mockResolvedValue([]);

      const result = await service.getStats('user-1');

      expect(result.total).toBe(15);
      expect(result.byStatus['IN_COLLECTION']).toBe(10);
      expect(result.byStatus['WISHLIST']).toBe(3);
      expect(result.byStatus['LOANED']).toBe(1);
      expect(result.byStatus['READ']).toBe(5);
      expect(result.totalRated).toBe(7);
      expect(result.averageRating).toBe(8.4);
    });

    it('returns null averageRating when no rated comics', async () => {
      mockPrisma.userComic.count.mockResolvedValue(0);
      mockPrisma.userComic.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      });
      mockPrisma.userComic.findMany.mockResolvedValue([]);

      const result = await service.getStats('user-1');
      expect(result.averageRating).toBeNull();
    });
  });
});
