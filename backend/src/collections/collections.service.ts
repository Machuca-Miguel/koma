import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByUser(userId: string) {
    return this.prisma.collection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId && !collection.isPublic) {
      throw new ForbiddenException('No tienes acceso a esta colección');
    }
    return collection;
  }

  async create(userId: string, dto: CreateCollectionDto) {
    return this.prisma.collection.create({
      data: { ...dto, userId },
    });
  }

  async update(id: string, userId: string, dto: UpdateCollectionDto) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId) {
      throw new ForbiddenException('No puedes modificar esta colección');
    }
    return this.prisma.collection.update({ where: { id }, data: dto });
  }

  async remove(id: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({ where: { id } });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId) {
      throw new ForbiddenException('No puedes eliminar esta colección');
    }
    return this.prisma.collection.delete({ where: { id } });
  }
}
