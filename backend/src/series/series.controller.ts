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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { UpdateSeriesDto } from './dto/update-series.dto';

interface AuthRequest {
  user: { id: string }
}

@ApiTags('series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('series')
export class SeriesController {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista series del usuario (con al menos un comic suyo) */
  @Get()
  @ApiOperation({ summary: 'Listar series del usuario' })
  async findAll(
    @Request() req: AuthRequest,
    @Query('q') q?: string,
  ) {
    const userId = req.user.id;
    const seriesWithUserComics = await this.prisma.series.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        comics: {
          some: {
            userComics: { some: { userId } },
          },
        },
      },
      include: {
        _count: { select: { comics: true } },
        comics: {
          where: { userComics: { some: { userId } } },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return seriesWithUserComics.map((s) => ({
      id: s.id,
      name: s.name,
      publisher: s.publisher,
      yearBegan: s.yearBegan,
      yearEnded: s.yearEnded,
      coverUrl: s.coverUrl,
      isOngoing: s.isOngoing,
      totalIssues: s.totalIssues,
      gcdSeriesId: s.gcdSeriesId,
      comicCount: s.comics.length,
    }));
  }

  /** Crea una serie manual (sin gcdSeriesId) */
  @Post()
  @ApiOperation({ summary: 'Crear una serie manual' })
  async create(@Body() dto: CreateSeriesDto) {
    return this.prisma.series.create({
      data: {
        name: dto.name,
        publisher: dto.publisher,
        yearBegan: dto.yearBegan,
        yearEnded: dto.yearEnded,
        coverUrl: dto.coverUrl,
        isOngoing: dto.yearEnded ? false : true,
      },
    });
  }

  /** Actualiza los campos de una serie */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una serie' })
  async update(@Param('id') id: string, @Body() dto: UpdateSeriesDto) {
    return this.prisma.series.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.publisher !== undefined && { publisher: dto.publisher }),
        ...(dto.yearBegan !== undefined && { yearBegan: dto.yearBegan }),
        ...(dto.yearEnded !== undefined && {
          yearEnded: dto.yearEnded,
          isOngoing: false,
        }),
        ...(dto.coverUrl !== undefined && { coverUrl: dto.coverUrl }),
      },
    });
  }

  /** Elimina una serie (solo si ningún cómic la referencia) */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una serie' })
  async remove(@Param('id') id: string) {
    const count = await this.prisma.comic.count({ where: { seriesId: id } });
    if (count > 0) {
      throw new BadRequestException(
        'No se puede eliminar una serie con cómics asociados',
      );
    }
    return this.prisma.series.delete({ where: { id } });
  }
}
