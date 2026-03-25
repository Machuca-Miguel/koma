import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GcdService } from './gcd.service';
import { SearchGcdDto } from './dto/search-gcd.dto';
import { ImportGcdDto } from './dto/import-gcd.dto';

@ApiTags('gcd')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gcd')
export class GcdController {
  constructor(
    private readonly gcdService: GcdService,
    private readonly prisma: PrismaService,
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

  @Get('detail/:id')
  @ApiOperation({
    summary: 'Detalle completo de un número GCD (autores, historias)',
  })
  getDetail(@Param('id') id: string) {
    return this.gcdService.getIssueDetail(id);
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

    const data = await this.gcdService.getIssue(dto.externalId);

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
      },
    });

    return { comic, imported: true };
  }
}
