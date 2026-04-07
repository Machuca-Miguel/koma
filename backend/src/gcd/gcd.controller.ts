import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SeriesService } from '../series/series.service';
import { GcdService } from './gcd.service';
import { SearchGcdDto } from './dto/search-gcd.dto';
import { ImportGcdDto } from './dto/import-gcd.dto';
import { BindingFormat } from '@prisma/client';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';

function mapGcdBinding(raw?: string): BindingFormat | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase();
  if (
    s.includes('hardcover') ||
    s.includes('cartoné') ||
    s.includes('cartone') ||
    s.includes('cased')
  )
    return BindingFormat.HARDCOVER;
  if (s.includes('digest') || s.includes('pocket') || s.includes('mass market'))
    return BindingFormat.BOLSILLO;
  if (s.includes('omnibus')) return BindingFormat.OMNIBUS;
  // saddle-stitched, perfect bound, squarebound, softcover, trade paperback → TAPA_BLANDA
  if (
    s.includes('saddle') ||
    s.includes('perfect') ||
    s.includes('square') ||
    s.includes('softcover') ||
    s.includes('paperback')
  )
    return BindingFormat.TAPA_BLANDA;
  return undefined;
}

@ApiTags('gcd')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gcd')
export class GcdController {
  constructor(
    private readonly gcdService: GcdService,
    private readonly prisma: PrismaService,
    private readonly seriesService: SeriesService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Buscar en Grand Comics Database (local)' })
  search(@Query() dto: SearchGcdDto) {
    return this.gcdService.search(dto.q ?? '', dto.page, {
      publisher: dto.publisher,
      creator: dto.creator,
      year: dto.year,
    });
  }

  @Get('series-search')
  @ApiOperation({
    summary: 'Buscar series en GCD (una card por serie, agrupadas)',
  })
  seriesSearch(@Query() dto: SearchGcdDto) {
    return this.gcdService.searchSeries(dto.q ?? '', dto.page, {
      publisher: dto.publisher,
      year: dto.year,
    });
  }

  @Get('series/:seriesId/completion')
  @ApiOperation({
    summary: 'Todos los números de una serie + cuáles tiene el usuario',
  })
  async seriesCompletion(
    @Request() req: AuthenticatedRequest,
    @Param('seriesId') seriesIdStr: string,
  ) {
    const seriesId = parseInt(seriesIdStr, 10);
    const result = await this.gcdService.getSeriesIssuesBySeriesId(seriesId);
    if (!result) return { seriesName: null, total: 0, owned: 0, issues: [] };

    const gcdIds = result.issues.map((i) => i.gcdId);

    const userComics = await this.prisma.comic.findMany({
      where: {
        externalApi: 'gcd',
        externalId: { in: gcdIds },
        userComics: { some: { userId: req.user.id, isOwned: true } },
      },
      select: { externalId: true },
    });

    const ownedIds = new Set(userComics.map((c) => c.externalId));

    return {
      seriesName: result.seriesName,
      total: result.issues.length,
      owned: ownedIds.size,
      issues: result.issues.map((i) => ({
        ...i,
        isOwned: ownedIds.has(i.gcdId),
      })),
    };
  }

  @Get('detail/:id')
  @ApiOperation({
    summary: 'Detalle completo de un número GCD (autores, historias)',
  })
  getDetail(@Param('id') id: string) {
    return this.gcdService.getIssueDetail(id);
  }

  @Get('series-completion')
  @ApiOperation({
    summary:
      'Completitud de una serie: qué números tiene el usuario vs total en GCD',
  })
  @ApiQuery({
    name: 'issueId',
    description: 'externalId de cualquier número de la serie (ej: gcd-12345)',
  })
  async getSeriesCompletion(
    @Request() req: AuthenticatedRequest,
    @Query('issueId') issueId: string,
  ) {
    const result = await this.gcdService.getSeriesIssues(issueId);
    if (!result) return { seriesName: null, total: 0, owned: 0, missing: [] };

    const gcdIds = result.issues.map((i) => i.gcdId);

    const userComics = await this.prisma.comic.findMany({
      where: {
        externalApi: 'gcd',
        externalId: { in: gcdIds },
        userComics: { some: { userId: req.user.id, isOwned: true } },
      },
      select: { externalId: true },
    });

    const ownedIds = new Set(userComics.map((c) => c.externalId));

    return {
      seriesName: result.seriesName,
      total: result.issues.length,
      owned: ownedIds.size,
      issues: result.issues.map((i) => ({
        ...i,
        isOwned: ownedIds.has(i.gcdId),
      })),
    };
  }

  @Post('import')
  @ApiOperation({
    summary: 'Importar un cómic de GCD a la base de datos local',
  })
  async import(@Body() dto: ImportGcdDto) {
    const existing = await this.prisma.comic.findFirst({
      where: { externalId: dto.externalId, externalApi: 'gcd' },
    });
    if (existing) return { comic: existing, imported: false };

    const data = await this.gcdService.getIssueDetail(dto.externalId);

    // Find or create the Series entity if we have GCD series data
    let seriesId: string | undefined;
    if (data.gcdSeriesId && data.seriesInfo) {
      const series = await this.seriesService.findOrCreateFromGcd(
        data.gcdSeriesId,
        {
          name: data.seriesInfo.name,
          publisher: data.publisher,
          yearBegan: data.seriesInfo.yearBegan,
          yearEnded: data.seriesInfo.yearEnded,
          issueCount: data.seriesInfo.issueCount,
          coverUrl: data.coverUrl,
        },
      );
      seriesId = series.id;
    }

    const authorNames = new Set<string>();
    for (const creator of data.creators) {
      if (creator.role === 'Guion' || creator.role === 'Dibujo') {
        creator.names.forEach((n) => authorNames.add(n));
      }
    }
    const authors = authorNames.size > 0 ? Array.from(authorNames).join(', ') : undefined;

    const comic = await this.prisma.comic.create({
      data: {
        title: data.title,
        issueNumber: data.issueNumber,
        publisher: data.publisher,
        year: data.year,
        synopsis: data.synopsis,
        coverUrl: data.coverUrl,
        externalId: data.externalId,
        externalApi: 'gcd',
        isbn: data.isbn,
        series: data.series,
        seriesId,
        binding: mapGcdBinding(data.seriesInfo?.binding),
        authors,
      },
    });

    return { comic, imported: true };
  }
}
