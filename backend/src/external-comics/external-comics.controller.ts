import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExternalComicsService } from './external-comics.service';
import { SearchExternalDto, ImportExternalDto } from './dto/search-external.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('external-comics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('external-comics')
export class ExternalComicsController {
  constructor(private readonly externalComicsService: ExternalComicsService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Buscar cómics en API externa',
    description: 'Busca en Comic Vine o Metron sin guardar en la BD',
  })
  search(@Query() dto: SearchExternalDto) {
    return this.externalComicsService.search(dto.q, dto.source, dto.page);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Importar un cómic a la BD',
    description: 'Trae los datos de la API externa y los guarda en la BD local. Si ya existe, lo devuelve directamente.',
  })
  import(@Body() dto: ImportExternalDto) {
    return this.externalComicsService.import(dto.externalId, dto.source);
  }
}
