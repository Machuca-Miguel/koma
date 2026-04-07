import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

const mockUsersService = {
  findByEmail: jest.fn(),
  validatePassword: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(() => 'mock-jwt-token'),
};

const MOCK_USER = {
  id: 'user-uuid',
  email: 'test@example.com',
  username: 'testuser',
  passwordHash: 'hashed-password',
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('returns user without passwordHash when credentials are valid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(MOCK_USER);
      mockUsersService.validatePassword.mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'correct-password',
      );

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('passwordHash');
      expect(result?.email).toBe(MOCK_USER.email);
    });

    it('returns null when user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      const result = await service.validateUser(
        'noone@example.com',
        'password',
      );
      expect(result).toBeNull();
    });

    it('returns null when password is incorrect', async () => {
      mockUsersService.findByEmail.mockResolvedValue(MOCK_USER);
      mockUsersService.validatePassword.mockResolvedValue(false);

      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('returns accessToken and user info', () => {
      const user = {
        id: MOCK_USER.id,
        email: MOCK_USER.email,
        username: MOCK_USER.username,
        language: 'es',
      };
      const result = service.login(user);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user).toEqual(user);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        username: user.username,
      });
    });
  });

  describe('register', () => {
    it('creates user and returns accessToken', async () => {
      const createdUser = { ...MOCK_USER };
      mockUsersService.create.mockResolvedValue(createdUser);

      const dto = {
        email: 'new@example.com',
        username: 'newuser',
        password: 'password123',
      };
      const result = await service.register(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith(
        dto.email,
        dto.username,
        dto.password,
      );
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe(createdUser.email);
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });
});
