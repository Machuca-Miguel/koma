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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComicsService } from './comics.service';
import { CreateComicDto } from './dto/create-comic.dto';
import { UpdateComicDto } from './dto/update-comic.dto';
import { QueryComicDto } from './dto/query-comic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cómic por ID' })
  findOne(@Param('id') id: string) {
    return this.comicsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un cómic' })
  create(@Body() dto: CreateComicDto) {
    return this.comicsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un cómic' })
  update(@Param('id') id: string, @Body() dto: UpdateComicDto) {
    return this.comicsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un cómic' })
  remove(@Param('id') id: string) {
    return this.comicsService.remove(id);
  }
}
