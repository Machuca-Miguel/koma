import {
  Controller,
  Get,
  Logger,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { IsArray, IsObject, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { IsbndbService } from './isbndb.service';
import { SearchBooksDto } from './dto/search-books.dto';
import { SearchCommonDto, SearchQueryDto } from './dto/search-common.dto';
import type { IsbndbBook } from './interfaces/isbndb.interface';

class BulkIsbnDto {
  @IsArray()
  @IsString({ each: true })
  isbns!: string[];
}

class ImportIsbndbDto {
  @IsObject()
  book!: IsbndbBook;
}

@ApiTags('isbndb')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('isbndb')
export class IsbndbController {
  private readonly logger = new Logger(IsbndbController.name);

  constructor(
    private readonly isbndb: IsbndbService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Books ──────────────────────────────────────────────────────────────────

  @Get('books/search')
  @ApiOperation({
    summary: 'Buscar libros por título, autor, editorial, ISBN o tema',
  })
  searchBooks(@Query() dto: SearchBooksDto) {
    return this.isbndb.searchBooks(dto);
  }

  @Get('book/:isbn')
  @ApiOperation({ summary: 'Obtener un libro por ISBN-10 o ISBN-13' })
  @ApiParam({ name: 'isbn', description: 'ISBN-10 o ISBN-13' })
  getBook(@Param('isbn') isbn: string) {
    return this.isbndb.getBook(isbn);
  }

  @Get('book/:isbn/editions')
  @ApiOperation({ summary: 'Obtener todas las ediciones de un libro por ISBN' })
  @ApiParam({ name: 'isbn', description: 'ISBN-10 o ISBN-13' })
  getBookEditions(@Param('isbn') isbn: string) {
    return this.isbndb.getBookEditions(isbn);
  }

  @Post('books/bulk')
  @ApiOperation({
    summary: 'Obtener múltiples libros por ISBNs (máx. 100 por llamada)',
  })
  getBooksBulk(@Body() dto: BulkIsbnDto) {
    return this.isbndb.getBooksBulk(dto.isbns);
  }

  // ── Authors ────────────────────────────────────────────────────────────────

  @Get('authors/search')
  @ApiOperation({ summary: 'Buscar autores/dibujantes por nombre' })
  searchAuthors(@Query() dto: SearchQueryDto) {
    return this.isbndb.searchAuthors(dto);
  }

  @Get('author/:name')
  @ApiOperation({ summary: 'Obtener libros de un autor/dibujante' })
  @ApiParam({ name: 'name', description: 'Nombre del autor' })
  getAuthorBooks(@Param('name') name: string, @Query() dto: SearchCommonDto) {
    return this.isbndb.getAuthorBooks(name, dto);
  }

  // ── Publishers ─────────────────────────────────────────────────────────────

  @Get('publishers/search')
  @ApiOperation({ summary: 'Buscar editoriales por nombre' })
  searchPublishers(@Query() dto: SearchQueryDto) {
    return this.isbndb.searchPublishers(dto);
  }

  @Get('publisher/:name')
  @ApiOperation({ summary: 'Obtener libros de una editorial' })
  @ApiParam({ name: 'name', description: 'Nombre de la editorial' })
  getPublisherBooks(
    @Param('name') name: string,
    @Query() dto: SearchCommonDto,
  ) {
    return this.isbndb.getPublisherBooks(name, dto);
  }

  // ── Subjects ───────────────────────────────────────────────────────────────

  @Get('subjects/search')
  @ApiOperation({ summary: 'Buscar temas/géneros' })
  searchSubjects(@Query() dto: SearchQueryDto) {
    return this.isbndb.searchSubjects(dto);
  }

  @Get('subject/:name')
  @ApiOperation({ summary: 'Obtener libros de un tema/género' })
  @ApiParam({ name: 'name', description: 'Nombre del tema' })
  getSubjectBooks(@Param('name') name: string, @Query() dto: SearchCommonDto) {
    return this.isbndb.getSubjectBooks(name, dto);
  }

  // ── Stats & Key ────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de la base de datos de ISBNDB' })
  getStats() {
    return this.isbndb.getStats();
  }

  @Get('key')
  @ApiOperation({ summary: 'Información y cuota de la API key activa' })
  getApiKey() {
    return this.isbndb.getApiKey();
  }

  // ── Feed (Premium+) ────────────────────────────────────────────────────────

  @Get('feeds/updates')
  @ApiOperation({
    summary: 'ISBNs actualizados recientemente (requiere plan Premium+)',
  })
  getFeedUpdates(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('lastUpdated') lastUpdated?: string,
  ) {
    return this.isbndb.getFeedUpdates({ page, pageSize, lastUpdated });
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  @Post('import')
  @ApiOperation({
    summary: 'Importar un libro de ISBNDB como cómic en la base de datos local',
  })
  async import(@Body() { book }: ImportIsbndbDto) {
    const isbn = book.isbn13 ?? book.isbn;

    const existing = await this.prisma.comic.findFirst({
      where: { isbn },
    });
    if (existing) return { comic: existing, imported: false };

    const rawYear = book.date_published
      ? parseInt(book.date_published.slice(0, 4), 10)
      : undefined;
    const year = rawYear !== undefined && !isNaN(rawYear) ? rawYear : undefined;

    const created = await this.prisma.comic.create({
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

    return { comic: created, imported: true };
  }
}
