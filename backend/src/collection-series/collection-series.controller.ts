import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CollectionSeriesService } from './collection-series.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('collection-series')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collections/:collectionId/series')
export class CollectionSeriesController {
  constructor(private readonly service: CollectionSeriesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar series de una colección' })
  findAll(@Param('collectionId') collectionId: string) {
    return this.service.findByCollection(collectionId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una serie en una colección' })
  create(
    @Param('collectionId') collectionId: string,
    @Body() body: { name: string },
  ) {
    return this.service.create(collectionId, body.name);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una serie' })
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; totalVolumes?: number | null },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una serie' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
