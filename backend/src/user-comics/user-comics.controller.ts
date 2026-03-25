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
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CollectionStatus } from '@prisma/client';
import { UserComicsService } from './user-comics.service';
import { AddComicDto } from './dto/add-comic.dto';
import { UpdateUserComicDto } from './dto/update-user-comic.dto';
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
  @ApiQuery({ name: 'status', enum: CollectionStatus, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: CollectionStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.userComicsService.findAll(req.user.id, { status, page, limit });
  }

  @Get('comic/:comicId')
  @ApiOperation({
    summary: 'Obtener entrada de biblioteca para un cómic específico',
  })
  findByComicId(@Request() req: AuthenticatedRequest, @Param('comicId') comicId: string) {
    return this.userComicsService.findByComicId(req.user.id, comicId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de mi biblioteca' })
  getStats(@Request() req: AuthenticatedRequest) {
    return this.userComicsService.getStats(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Agregar un cómic a mi biblioteca' })
  add(@Request() req: AuthenticatedRequest, @Body() dto: AddComicDto) {
    return this.userComicsService.add(req.user.id, dto);
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

  @Delete(':comicId')
  @ApiOperation({ summary: 'Eliminar un cómic de mi biblioteca' })
  remove(@Request() req: AuthenticatedRequest, @Param('comicId') comicId: string) {
    return this.userComicsService.remove(req.user.id, comicId);
  }
}
