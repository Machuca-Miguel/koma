/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const user = { id: '1', email: 'a@b.com', username: 'alice' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findByEmail('a@b.com');
      expect(result).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
      });
    });

    it('returns null when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await service.findByEmail('nobody@example.com');
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates user with hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const newUser = {
        id: 'new-id',
        email: 'new@b.com',
        username: 'newuser',
        passwordHash: 'hash',
      };
      mockPrisma.user.create.mockResolvedValue(newUser);

      const result = await service.create(
        'new@b.com',
        'newuser',
        'password123',
      );

      expect(mockPrisma.user.create).toHaveBeenCalled();
      const createCall = mockPrisma.user.create.mock.calls[0][0].data;
      expect(createCall.email).toBe('new@b.com');
      expect(createCall.username).toBe('newuser');
      expect(createCall.passwordHash).toBeDefined();
      expect(createCall.passwordHash).not.toBe('password123');
      expect(result).toEqual(newUser);
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: '1',
        email: 'a@b.com',
      });

      await expect(service.create('a@b.com', 'user2', 'pass')).rejects.toThrow(
        ConflictException,
      );
    });

    it('throws ConflictException when username already exists', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(null) // email not found
        .mockResolvedValueOnce({ id: '2', username: 'taken' }); // username found

      await expect(
        service.create('new@b.com', 'taken', 'pass'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validatePassword', () => {
    it('returns true for correct password', async () => {
      const hash = await bcrypt.hash('mypassword', 10);
      const result = await service.validatePassword('mypassword', hash);
      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hash = await bcrypt.hash('mypassword', 10);
      const result = await service.validatePassword('wrongpassword', hash);
      expect(result).toBe(false);
    });
  });
});
