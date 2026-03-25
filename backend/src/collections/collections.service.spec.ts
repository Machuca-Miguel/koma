import { Test } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CollectionsService } from './collections.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  collection: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  collectionComic: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  comic: {
    findUnique: jest.fn(),
  },
};

const MOCK_COLLECTION = {
  id: 'col-1',
  name: 'My Collection',
  userId: 'user-1',
  isPublic: false,
  createdAt: new Date(),
  _count: { comics: 0 },
};

const MOCK_COMIC = { id: 'comic-1', title: 'Batman #1' };

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

      const result = await service.findOne('col-1', 'user-1');
      expect(result).toEqual(MOCK_COLLECTION);
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

      const result = await service.findOne('col-1', 'other-user');
      expect(result).toBeDefined();
    });
  });

  describe('create', () => {
    it('creates collection with userId', async () => {
      mockPrisma.collection.create.mockResolvedValue(MOCK_COLLECTION);

      await service.create('user-1', { name: 'My Collection' });

      expect(mockPrisma.collection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            name: 'My Collection',
          }),
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

      const result = await service.update('col-1', 'user-1', {
        name: 'Updated',
      });
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
    it('adds comic to collection', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);
      mockPrisma.collectionComic.findUnique.mockResolvedValue(null);
      mockPrisma.collectionComic.create.mockResolvedValue({
        collectionId: 'col-1',
        comicId: 'comic-1',
      });

      const result = await service.addComic('col-1', 'user-1', 'comic-1');
      expect(mockPrisma.collectionComic.create).toHaveBeenCalled();
    });

    it('throws NotFoundException when comic does not exist', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.comic.findUnique.mockResolvedValue(null);

      await expect(
        service.addComic('col-1', 'user-1', 'bad-comic'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when comic already in collection', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.comic.findUnique.mockResolvedValue(MOCK_COMIC);
      mockPrisma.collectionComic.findUnique.mockResolvedValue({
        collectionId: 'col-1',
        comicId: 'comic-1',
      });

      await expect(
        service.addComic('col-1', 'user-1', 'comic-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('removeComic', () => {
    it('removes comic from collection', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.collectionComic.findUnique.mockResolvedValue({
        collectionId: 'col-1',
        comicId: 'comic-1',
      });
      mockPrisma.collectionComic.delete.mockResolvedValue({});

      await service.removeComic('col-1', 'user-1', 'comic-1');
      expect(mockPrisma.collectionComic.delete).toHaveBeenCalled();
    });

    it('throws NotFoundException when comic not in collection', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(MOCK_COLLECTION);
      mockPrisma.collectionComic.findUnique.mockResolvedValue(null);

      await expect(
        service.removeComic('col-1', 'user-1', 'comic-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
