/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ComicsService } from './comics.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateComicDto } from './dto/create-comic.dto';
import type { UpdateComicDto } from './dto/update-comic.dto';

const mockPrisma = {
  comic: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

const MOCK_COMIC = {
  id: 'comic-1',
  title: 'Batman #1',
  publisher: 'DC Comics',
  year: 2020,
  isbn: '9780000000001',
  createdBy: 'user-1',
  createdAt: new Date(),
  tags: [],
};

describe('ComicsService', () => {
  let service: ComicsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ComicsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ComicsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated results', async () => {
      mockPrisma.comic.findMany.mockResolvedValue([MOCK_COMIC]);
      mockPrisma.comic.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('applies search filter with OR on title and publisher', async () => {
      mockPrisma.comic.findMany.mockResolvedValue([]);
      mockPrisma.comic.count.mockResolvedValue(0);

      await service.findAll({ search: 'batman', page: 1, limit: 20 });

      const whereArg = mockPrisma.comic.findMany.mock.calls[0][0].where as {
        OR: { title: { contains: string } }[];
      };
      expect(whereArg.OR).toBeDefined();
      expect(whereArg.OR[0].title.contains).toBe('batman');
    });

    it('calculates correct skip for page 2', async () => {
      mockPrisma.comic.findMany.mockResolvedValue([]);
      mockPrisma.comic.count.mockResolvedValue(0);

      await service.findAll({ page: 2, limit: 10 });

      expect(mockPrisma.comic.findMany.mock.calls[0][0].skip).toBe(10);
    });
  });

  describe('findOne', () => {
    it('returns comic when found', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);

      const result = await service.findOne('comic-1');
      expect(result).toEqual(MOCK_COMIC);
    });

    it('throws NotFoundException when comic does not exist', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates and returns comic', async () => {
      mockPrisma.comic.create.mockResolvedValue(MOCK_COMIC);

      const dto: CreateComicDto = {
        title: 'Batman #1',
        publisher: 'DC Comics',
        isbn: '9780000000001',
      };
      const result = await service.create(dto, 'user-1');

      expect(mockPrisma.comic.create).toHaveBeenCalledWith({
        data: { ...dto, createdBy: 'user-1' },
      });
      expect(result).toEqual(MOCK_COMIC);
    });
  });

  describe('update', () => {
    it('updates comic when called by creator', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);
      const updated = { ...MOCK_COMIC, title: 'Batman #2' };
      mockPrisma.comic.update.mockResolvedValue(updated);

      const dto: UpdateComicDto = { title: 'Batman #2' };
      const result = await service.update('comic-1', dto, 'user-1');
      expect(result.title).toBe('Batman #2');
    });

    it('throws ForbiddenException when non-creator tries to update', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);

      await expect(
        service.update('comic-1', { title: 'Hack' }, 'other-user'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.comic.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for non-existent comic', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(null);

      await expect(service.update('bad-id', {}, 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.comic.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes comic when it exists', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);
      mockPrisma.comic.delete.mockResolvedValue(MOCK_COMIC);

      await service.remove('comic-1');
      expect(mockPrisma.comic.delete).toHaveBeenCalledWith({
        where: { id: 'comic-1' },
      });
    });

    it('throws NotFoundException for non-existent comic', async () => {
      mockPrisma.comic.findUnique.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.comic.delete).not.toHaveBeenCalled();
    });
  });
});
