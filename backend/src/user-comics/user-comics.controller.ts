import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  ParseIntPipe,
  DefaultValuePipe,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { CollectionStatus } from '@prisma/client';
import { UserComicsService } from './user-comics.service';
import type { SortBy, StatusFilter } from './user-comics.service';
import { AddComicDto } from './dto/add-comic.dto';
import { UpdateUserComicDto } from './dto/update-user-comic.dto';
import { AddComicsToCollectionDto } from './dto/add-to-collection.dto';

class AddByIsbnDto {
  @IsString()
  isbn!: string;

  @IsIn(Object.values(CollectionStatus))
  @IsOptional()
  collectionStatus?: CollectionStatus;
}

class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  comicIds!: string[];
}
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';

@ApiTags('my-library')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('my-library')
export class UserComicsController {
  constructor(private readonly userComicsService: UserComicsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener mi biblioteca de cómics' })
  @ApiQuery({
    name: 'status',
    enum: [
      'IN_COLLECTION',
      'WISHLIST',
      'LOANED',
      'READ',
      'READING',
      'TO_READ',
      'FOR_SALE',
      'TO_SELL',
      'SOLD',
      'ALL',
    ],
    required: false,
  })
  @ApiQuery({
    name: 'sortBy',
    enum: ['series_asc', 'title_asc', 'year_asc', 'added_desc', 'rating_desc'],
    required: false,
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Término de búsqueda',
  })
  @ApiQuery({
    name: 'searchBy',
    required: false,
    enum: ['title', 'authors', 'scriptwriter', 'artist', 'publisher'],
    description: 'Campo en el que buscar (por defecto busca en todos)',
  })
  @ApiQuery({
    name: 'tag',
    required: false,
    type: String,
    description: 'Filtrar por slug de tag',
  })
  @ApiQuery({
    name: 'publisher',
    required: false,
    type: String,
    description: 'Filtrar por editorial',
  })
  @ApiQuery({
    name: 'yearFrom',
    required: false,
    type: Number,
    description: 'Año de publicación desde',
  })
  @ApiQuery({
    name: 'yearTo',
    required: false,
    type: Number,
    description: 'Año de publicación hasta',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: StatusFilter,
    @Query('sortBy') sortBy?: SortBy,
    @Query('q') q?: string,
    @Query('searchBy')
    searchBy?: 'title' | 'authors' | 'scriptwriter' | 'artist' | 'publisher',
    @Query('tag') tag?: string,
    @Query('publisher') publisher?: string,
    @Query('yearFrom') yearFrom?: string,
    @Query('yearTo') yearTo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.userComicsService.findAll(req.user.id, {
      status,
      sortBy,
      q,
      searchBy,
      tag,
      publisher,
      yearFrom,
      yearTo,
      page,
      limit,
    });
  }

  @Get('series/:id')
  @ApiOperation({
    summary: 'Detalle de una serie en la biblioteca del usuario',
  })
  getSeriesDetail(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.userComicsService.getSeriesDetail(req.user.id, id);
  }

  @Patch('series/:id/reorder')
  @ApiOperation({ summary: 'Reordenar cómics de una serie en la biblioteca' })
  reorderSeries(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { positions: { comicId: string; position: number }[] },
  ) {
    return this.userComicsService.reorderSeries(
      req.user.id,
      id,
      body.positions,
    );
  }

  @Get('series-view')
  @ApiOperation({ summary: 'Vista de biblioteca agrupada por serie' })
  @ApiQuery({
    name: 'status',
    enum: [
      'IN_COLLECTION',
      'WISHLIST',
      'LOANED',
      'READ',
      'READING',
      'TO_READ',
      'FOR_SALE',
      'TO_SELL',
      'SOLD',
      'ALL',
    ],
    required: false,
  })
  @ApiQuery({ name: 'q', required: false, type: String })
  getSeriesView(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: StatusFilter,
    @Query('q') q?: string,
  ) {
    return this.userComicsService.getSeriesView(req.user.id, { status, q });
  }

  @Get('comic/:comicId')
  @ApiOperation({
    summary: 'Obtener entrada de biblioteca para un cómic específico',
  })
  findByComicId(
    @Request() req: AuthenticatedRequest,
    @Param('comicId') comicId: string,
  ) {
    return this.userComicsService.findByComicId(req.user.id, comicId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de mi biblioteca' })
  getStats(@Request() req: AuthenticatedRequest) {
    return this.userComicsService.getStats(req.user.id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar biblioteca como CSV o JSON' })
  @ApiQuery({ name: 'format', enum: ['csv', 'json'], required: false })
  async export(
    @Request() req: AuthenticatedRequest,
    @Query('format') format: 'csv' | 'json' = 'json',
    @Res() res: Response,
  ) {
    const content = await this.userComicsService.exportLibrary(
      req.user.id,
      format,
    );
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="koma-library.csv"',
      );
    } else {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="koma-library.json"',
      );
    }
    res.send(content);
  }

  @Post()
  @ApiOperation({ summary: 'Agregar un cómic a mi biblioteca' })
  add(@Request() req: AuthenticatedRequest, @Body() dto: AddComicDto) {
    return this.userComicsService.add(req.user.id, dto);
  }

  @Post('to-collection')
  @ApiOperation({ summary: 'Asignar múltiples cómics de la biblioteca a una serie (atómico)' })
  addMultipleToCollection(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AddComicsToCollectionDto,
  ) {
    return this.userComicsService.addMultipleToCollection(req.user.id, dto);
  }

  @Post('add-by-isbn')
  @ApiOperation({
    summary:
      'Buscar un cómic por ISBN en ISBNDB, crearlo si no existe y añadirlo a la biblioteca',
  })
  addByIsbn(@Request() req: AuthenticatedRequest, @Body() dto: AddByIsbnDto) {
    return this.userComicsService.addByIsbn(req.user.id, dto.isbn, {
      collectionStatus: dto.collectionStatus,
    });
  }

  @Patch(':comicId')
  @ApiOperation({ summary: 'Actualizar estado/puntuación de un cómic' })
  update(
    @Request() req: AuthenticatedRequest,
    @Param('comicId') comicId: string,
    @Body() dto: UpdateUserComicDto,
  ) {
    return this.userComicsService.update(req.user.id, comicId, dto);
  }

  @Delete('bulk')
  @ApiOperation({ summary: 'Eliminar varios cómics de mi biblioteca de una vez (ej: colección completa)' })
  removeBulk(@Request() req: AuthenticatedRequest, @Body() dto: BulkDeleteDto) {
    return this.userComicsService.removeBulk(req.user.id, dto.comicIds);
  }

  @Delete(':comicId')
  @ApiOperation({ summary: 'Eliminar un cómic de mi biblioteca' })
  remove(
    @Request() req: AuthenticatedRequest,
    @Param('comicId') comicId: string,
  ) {
    return this.userComicsService.remove(req.user.id, comicId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Importar biblioteca desde CSV' })
  async importLibrary(
    @Request() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const csvString = file.buffer.toString('utf-8');
    return this.userComicsService.importLibrary(req.user.id, csvString);
  }
}
