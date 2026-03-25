import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
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
      include: { _count: { select: { comics: true } } },
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

  async findComics(collectionId: string, userId: string) {
    await this.findOne(collectionId, userId);
    return this.prisma.collectionComic.findMany({
      where: { collectionId },
      include: { comic: { include: { tags: { include: { tag: true } } } } },
      orderBy: { addedAt: 'desc' },
    });
  }

  async addComic(collectionId: string, userId: string, comicId: string) {
    await this.findOne(collectionId, userId);
    const comic = await this.prisma.comic.findUnique({
      where: { id: comicId },
    });
    if (!comic) throw new NotFoundException('Cómic no encontrado');
    const existing = await this.prisma.collectionComic.findUnique({
      where: { collectionId_comicId: { collectionId, comicId } },
    });
    if (existing)
      throw new ConflictException('El cómic ya está en esta colección');
    return this.prisma.collectionComic.create({
      data: { collectionId, comicId },
      include: { comic: true },
    });
  }

  async removeComic(collectionId: string, userId: string, comicId: string) {
    await this.findOne(collectionId, userId);
    const entry = await this.prisma.collectionComic.findUnique({
      where: { collectionId_comicId: { collectionId, comicId } },
    });
    if (!entry)
      throw new NotFoundException('El cómic no está en esta colección');
    return this.prisma.collectionComic.delete({
      where: { collectionId_comicId: { collectionId, comicId } },
    });
  }

  async create(userId: string, dto: CreateCollectionDto) {
    return this.prisma.collection.create({
      data: { ...dto, userId },
      include: { _count: { select: { comics: true } } },
    });
  }

  async update(id: string, userId: string, dto: UpdateCollectionDto) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId)
      throw new ForbiddenException('No puedes modificar esta colección');
    return this.prisma.collection.update({
      where: { id },
      data: dto,
      include: { _count: { select: { comics: true } } },
    });
  }

  async remove(id: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id },
    });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection.userId !== userId)
      throw new ForbiddenException('No puedes eliminar esta colección');
    return this.prisma.collection.delete({ where: { id } });
  }
}
