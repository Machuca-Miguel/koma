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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComicsService } from './comics.service';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import { QueryComicDto } from './dto/query-comic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request.interface';

@ApiTags('comics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('comics')
export class ComicsController {
  constructor(private readonly comicsService: ComicsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar y buscar cómics' })
  findAll(@Query() query: QueryComicDto) {
    return this.comicsService.findAll(query);
  }

  @Get('tags/user')
  @ApiOperation({ summary: 'Obtener todos los tags del usuario' })
  getTagsByUser(@Request() req: AuthenticatedRequest) {
    return this.comicsService.getTagsByUser(req.user.id);
  }

  @Get(':id/collections')
  @ApiOperation({ summary: 'Obtener colecciones donde el usuario tiene asignado este cómic' })
  getCollections(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.comicsService.getCollections(id, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cómic por ID' })
  findOne(@Param('id') id: string) {
    return this.comicsService.findOne(id);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Añadir tag a un cómic' })
  addTag(@Param('id') id: string, @Body() body: { name: string }) {
    return this.comicsService.addTag(id, body.name);
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: 'Eliminar tag de un cómic' })
  removeTag(@Param('id') id: string, @Param('tagId') tagId: string) {
    return this.comicsService.removeTag(id, tagId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un cómic' })
  create(@Body() dto: CreateComicDto, @Request() req: AuthenticatedRequest) {
    return this.comicsService.create(dto, req.user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un cómic (solo el creador)' })
  update(@Param('id') id: string, @Body() dto: UpdateComicDto, @Request() req: AuthenticatedRequest) {
    return this.comicsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un cómic' })
  remove(@Param('id') id: string) {
    return this.comicsService.remove(id);
  }
}
