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
    @Request() req: any,
    @Query('status') status?: CollectionStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.userComicsService.findAll(req.user.id, { status, page, limit });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de mi biblioteca' })
  getStats(@Request() req: any) {
    return this.userComicsService.getStats(req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Agregar un cómic a mi biblioteca' })
  add(@Request() req: any, @Body() dto: AddComicDto) {
    return this.userComicsService.add(req.user.id, dto);
  }

  @Patch(':comicId')
  @ApiOperation({ summary: 'Actualizar estado/puntuación de un cómic' })
  update(
    @Request() req: any,
    @Param('comicId') comicId: string,
    @Body() dto: UpdateUserComicDto,
  ) {
    return this.userComicsService.update(req.user.id, comicId, dto);
  }

  @Delete(':comicId')
  @ApiOperation({ summary: 'Eliminar un cómic de mi biblioteca' })
  remove(@Request() req: any, @Param('comicId') comicId: string) {
    return this.userComicsService.remove(req.user.id, comicId);
  }
}
