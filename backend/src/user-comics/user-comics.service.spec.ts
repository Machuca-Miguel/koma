import { Test } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UserComicsService } from './user-comics.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  userComic: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    groupBy: jest.fn(),
    aggregate: jest.fn(),
  },
  comic: {
    findUnique: jest.fn(),
  },
};

const MOCK_COMIC = { id: 'comic-1', title: 'Batman #1' };
const MOCK_USER_COMIC = {
  id: 'uc-1',
  userId: 'user-1',
  comicId: 'comic-1',
  status: 'OWNED',
  rating: 8,
  notes: 'Great issue',
  addedAt: new Date(),
  comic: MOCK_COMIC,
};

describe('UserComicsService', () => {
  let service: UserComicsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserComicsService,
        { provide: PrismaService, useValue: mockPrisma },
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

    it('filters by status', async () => {
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.count.mockResolvedValue(0);

      await service.findAll('user-1', { status: 'OWNED' as any });

      const whereArg = mockPrisma.userComic.findMany.mock.calls[0][0].where;
      expect(whereArg.status).toBe('OWNED');
    });

    it('applies correct skip for page 3', async () => {
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.count.mockResolvedValue(0);

      await service.findAll('user-1', { page: 3, limit: 10 });

      expect(mockPrisma.userComic.findMany.mock.calls[0][0].skip).toBe(20);
    });
  });

  describe('add', () => {
    it('adds comic to library', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);
      mockPrisma.userComic.findUnique.mockResolvedValue(null);
      mockPrisma.userComic.create.mockResolvedValue(MOCK_USER_COMIC);

      const result = await service.add('user-1', {
        comicId: 'comic-1',
        status: 'OWNED' as any,
      });
      expect(result).toEqual(MOCK_USER_COMIC);
    });

    it('throws NotFoundException when comic does not exist', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(null);

      await expect(
        service.add('user-1', { comicId: 'bad-id', status: 'OWNED' as any }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when comic already in library', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);
      mockPrisma.userComic.findUnique.mockResolvedValue(MOCK_USER_COMIC);

      await expect(
        service.add('user-1', { comicId: 'comic-1', status: 'OWNED' as any }),
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
    it('returns stats by status and average rating', async () => {
      mockPrisma.userComic.groupBy.mockResolvedValue([
        { status: 'OWNED', _count: { status: 10 } },
        { status: 'READ', _count: { status: 5 } },
      ]);
      mockPrisma.userComic.aggregate.mockResolvedValue({
        _avg: { rating: 8.4 },
        _count: { rating: 7 },
      });

      const result = await service.getStats('user-1');

      expect(result.byStatus['OWNED']).toBe(10);
      expect(result.byStatus['READ']).toBe(5);
      expect(result.totalRated).toBe(7);
      expect(result.averageRating).toBe(8.4);
    });

    it('returns null averageRating when no rated comics', async () => {
      mockPrisma.userComic.groupBy.mockResolvedValue([]);
      mockPrisma.userComic.aggregate.mockResolvedValue({
        _avg: { rating: null },
        _count: { rating: 0 },
      });

      const result = await service.getStats('user-1');
      expect(result.averageRating).toBeNull();
    });
  });
});
