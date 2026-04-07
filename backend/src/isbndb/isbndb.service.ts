import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import type {
  IsbndbBook,
  IsbndbBookResponse,
  IsbndbBooksResponse,
  IsbndbAuthorsResponse,
  IsbndbAuthorBooksResponse,
  IsbndbPublishersResponse,
  IsbndbPublisherBooksResponse,
  IsbndbSubjectsResponse,
  IsbndbSubjectBooksResponse,
  IsbndbStatsResponse,
  IsbndbKeyResponse,
  IsbndbFeedResponse,
} from './interfaces/isbndb.interface';
import type { SearchBooksDto } from './dto/search-books.dto';
import type { SearchCommonDto, SearchQueryDto } from './dto/search-common.dto';

const BASE_URL = 'https://api2.isbndb.com';
const MIN_INTERVAL_MS = 1_000; // 1 req/s — plan Basic limit

@Injectable()
export class IsbndbService {
  private readonly logger = new Logger(IsbndbService.name);
  private readonly client: AxiosInstance;
  private lastRequestAt = 0;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.getOrThrow<string>('ISBNDB_API_KEY');
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10_000,
      headers: { Authorization: apiKey },
    });
  }

  // ── Rate limiting (1 req/s) ────────────────────────────────────────────────

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < MIN_INTERVAL_MS) {
      await new Promise<void>((r) => setTimeout(r, MIN_INTERVAL_MS - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private async get<T>(
    path: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    await this.throttle();
    this.logger.debug(`GET ${path}`);
    const { data } = await this.client.get<T>(path, { params });
    return data;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    await this.throttle();
    this.logger.debug(`POST ${path}`);
    const { data } = await this.client.post<T>(path, body);
    return data;
  }

  // ── Books ──────────────────────────────────────────────────────────────────

  async getBook(isbn: string): Promise<IsbndbBook> {
    const data = await this.get<IsbndbBookResponse>(`/book/${isbn}`);
    return data.book;
  }

  async getBookEditions(isbn: string): Promise<IsbndbBooksResponse> {
    return this.get<IsbndbBooksResponse>(`/books/${isbn}`);
  }

  async getBooksBulk(isbns: string[]): Promise<IsbndbBooksResponse> {
    return this.post<IsbndbBooksResponse>('/books', { isbns });
  }

  async searchBooks(dto: SearchBooksDto): Promise<IsbndbBooksResponse> {
    // ISBNDB: query is a path param — GET /books/{query}
    const params: Record<string, unknown> = {
      page: dto.page ?? 1,
      pageSize: dto.pageSize ?? 20,
    };
    if (dto.column) params.column = dto.column;
    if (dto.language) params.language = dto.language;
    if (dto.year) params.year = dto.year;
    if (dto.edition) params.edition = dto.edition;
    if (dto.shouldMatchAll !== undefined)
      params.shouldMatchAll = dto.shouldMatchAll;
    return this.get<IsbndbBooksResponse>(
      `/books/${encodeURIComponent(dto.q)}`,
      params,
    );
  }

  // ── Authors ────────────────────────────────────────────────────────────────

  async searchAuthors(dto: SearchQueryDto): Promise<IsbndbAuthorsResponse> {
    // ISBNDB: query is a path param — GET /authors/{query}
    return this.get<IsbndbAuthorsResponse>(
      `/authors/${encodeURIComponent(dto.q)}`,
      {
        page: dto.page ?? 1,
        pageSize: dto.pageSize ?? 20,
      },
    );
  }

  async getAuthorBooks(
    name: string,
    dto: SearchCommonDto,
  ): Promise<IsbndbAuthorBooksResponse> {
    return this.get<IsbndbAuthorBooksResponse>(
      `/author/${encodeURIComponent(name)}`,
      {
        page: dto.page ?? 1,
        pageSize: dto.pageSize ?? 20,
      },
    );
  }

  // ── Publishers ─────────────────────────────────────────────────────────────

  async searchPublishers(
    dto: SearchQueryDto,
  ): Promise<IsbndbPublishersResponse> {
    // ISBNDB: query is a path param — GET /publishers/{query}
    return this.get<IsbndbPublishersResponse>(
      `/publishers/${encodeURIComponent(dto.q)}`,
      {
        page: dto.page ?? 1,
        pageSize: dto.pageSize ?? 20,
      },
    );
  }

  async getPublisherBooks(
    name: string,
    dto: SearchCommonDto,
  ): Promise<IsbndbPublisherBooksResponse> {
    return this.get<IsbndbPublisherBooksResponse>(
      `/publisher/${encodeURIComponent(name)}`,
      {
        page: dto.page ?? 1,
        pageSize: dto.pageSize ?? 20,
      },
    );
  }

  // ── Subjects ───────────────────────────────────────────────────────────────

  async searchSubjects(dto: SearchQueryDto): Promise<IsbndbSubjectsResponse> {
    // ISBNDB: query is a path param — GET /subjects/{query}
    return this.get<IsbndbSubjectsResponse>(
      `/subjects/${encodeURIComponent(dto.q)}`,
      {
        page: dto.page ?? 1,
        pageSize: dto.pageSize ?? 20,
      },
    );
  }

  async getSubjectBooks(
    name: string,
    dto: SearchCommonDto,
  ): Promise<IsbndbSubjectBooksResponse> {
    return this.get<IsbndbSubjectBooksResponse>(
      `/subject/${encodeURIComponent(name)}`,
      {
        page: dto.page ?? 1,
        pageSize: dto.pageSize ?? 20,
      },
    );
  }

  // ── Stats & Key ────────────────────────────────────────────────────────────

  async getStats(): Promise<IsbndbStatsResponse> {
    return this.get<IsbndbStatsResponse>('/stats');
  }

  async getApiKey(): Promise<IsbndbKeyResponse> {
    return this.get<IsbndbKeyResponse>('/key');
  }

  // ── Feed (Premium+) ────────────────────────────────────────────────────────

  async getFeedUpdates(params: {
    page?: number;
    pageSize?: number;
    lastUpdated?: string;
  }): Promise<IsbndbFeedResponse> {
    return this.get<IsbndbFeedResponse>('/feeds/books/updates', {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 20,
      ...(params.lastUpdated ? { lastUpdated: params.lastUpdated } : {}),
    });
  }
}
