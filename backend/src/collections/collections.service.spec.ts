/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  $transaction: jest.fn().mockImplementation((fn: (tx: typeof mockPrisma) => unknown) => fn(mockPrisma)),
  collection: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  collectionSeries: {
    findFirst: jest.fn(),
    create: jest.fn(),
  },
  userComic: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
};

const MOCK_COLLECTION = {
  id: 'col-1',
  name: 'My Collection',
  userId: 'user-1',
  isPublic: false,
  createdAt: new Date(),
  series: [],
};

const MOCK_DEFAULT_SERIES = {
  id: 'series-1',
  name: 'Principal',
  collectionId: 'col-1',
  isDefault: true,
};

describe('CollectionsService', () => {
  let service: CollectionsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CollectionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CollectionsService);
    jest.clearAllMocks();
  });

  describe('findAllByUser', () => {
    it('returns collections for user', async () => {
      mockPrisma.collection.findMany.mockResolvedValue([MOCK_COLLECTION]);
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.groupBy.mockResolvedValue([]);

      const result = await service.findAllByUser('user-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.collection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } }),
      );
    });
  });

  describe('findOne', () => {
    it('returns collection when found and user matches', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.userComic.findMany.mockResolvedValue([]);

      const result = await service.findOne('col-1', 'user-1');
      expect(result).toMatchObject({ id: 'col-1', name: 'My Collection' });
    });

    it('throws NotFoundException when collection does not exist', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(null);

      await expect(service.findOne('bad-id', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when user does not own private collection', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue({
        ...MOCK_COLLECTION,
        isPublic: false,
      });

      await expect(service.findOne('col-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows access to public collection from other user', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue({
        ...MOCK_COLLECTION,
        isPublic: true,
      });
      mockPrisma.userComic.findMany.mockResolvedValue([]);

      const result = await service.findOne('col-1', 'other-user');
      expect(result).toBeDefined();
    });
  });

  describe('create', () => {
    it('creates collection and default series atomically', async () => {
      mockPrisma.collection.create.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.collectionSeries.create.mockResolvedValue(MOCK_DEFAULT_SERIES);

      const result = await service.create('user-1', { name: 'My Collection' });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'user-1', name: 'My Collection' }),
        }),
      );
      expect(mockPrisma.collectionSeries.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ collectionId: 'col-1', isDefault: true, name: 'Principal' }),
        }),
      );
      expect(result).toEqual({ collection: MOCK_COLLECTION, series: MOCK_DEFAULT_SERIES });
    });

    it('uses initialSeriesName when provided', async () => {
      mockPrisma.collection.create.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.collectionSeries.create.mockResolvedValue({ ...MOCK_DEFAULT_SERIES, name: 'Arco principal' });

      await service.create('user-1', { name: 'My Collection', initialSeriesName: 'Arco principal' });

      expect(mockPrisma.collectionSeries.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Arco principal' }),
        }),
      );
    });
  });

  describe('update', () => {
    it('updates collection when user owns it', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.collection.update.mockResolvedValue({
        ...MOCK_COLLECTION,
        name: 'Updated',
      });

      const result = await service.update('col-1', 'user-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('throws ForbiddenException when user does not own collection', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);

      await expect(
        service.update('col-1', 'other-user', { name: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.collection.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when collection does not exist', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(null);

      await expect(service.update('bad-id', 'user-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes collection when user owns it', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.collection.delete.mockResolvedValue(MOCK_COLLECTION);

      await service.remove('col-1', 'user-1');
      expect(mockPrisma.collection.delete).toHaveBeenCalledWith({
        where: { id: 'col-1' },
      });
    });

    it('throws ForbiddenException when user does not own collection', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);

      await expect(service.remove('col-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.collection.delete).not.toHaveBeenCalled();
    });
  });

  describe('addComic', () => {
    it('adds comic to default series of collection', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.findUnique.mockResolvedValue({
        id: 'uc-1',
        userId: 'user-1',
        comicId: 'comic-1',
        collectionSeriesId: null,
      });
      mockPrisma.collectionSeries.findFirst.mockResolvedValue(MOCK_DEFAULT_SERIES);
      mockPrisma.userComic.update.mockResolvedValue({});

      await service.addComic('col-1', 'user-1', 'comic-1');
      expect(mockPrisma.userComic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ collectionSeriesId: 'series-1' }),
        }),
      );
    });

    it('throws NotFoundException when comic not in user library', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.findUnique.mockResolvedValue(null);

      await expect(
        service.addComic('col-1', 'user-1', 'bad-comic'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when comic already assigned to a series', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.findUnique.mockResolvedValue({
        id: 'uc-1',
        userId: 'user-1',
        comicId: 'comic-1',
        collectionSeriesId: 'some-series',
      });

      await expect(
        service.addComic('col-1', 'user-1', 'comic-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeComic', () => {
    it('removes comic from collection (clears series assignment)', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.findFirst.mockResolvedValue({
        id: 'uc-1',
        userId: 'user-1',
        comicId: 'comic-1',
        collectionSeriesId: 'series-1',
      });
      mockPrisma.userComic.update.mockResolvedValue({});

      await service.removeComic('col-1', 'user-1', 'comic-1');
      expect(mockPrisma.userComic.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ collectionSeriesId: null }),
        }),
      );
    });

    it('throws NotFoundException when comic not in collection', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.userComic.findMany.mockResolvedValue([]);
      mockPrisma.userComic.findFirst.mockResolvedValue(null);

      await expect(
        service.removeComic('col-1', 'user-1', 'comic-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
