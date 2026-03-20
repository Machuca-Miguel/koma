import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('collections')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar mis colecciones' })
  findAll(@Request() req: any) {
    return this.collectionsService.findAllByUser(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una colección' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.collectionsService.findOne(id, req.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una colección' })
  create(@Request() req: any, @Body() dto: CreateCollectionDto) {
    return this.collectionsService.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una colección' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ) {
    return this.collectionsService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una colección' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.collectionsService.remove(id, req.user.id);
  }
}
