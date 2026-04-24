import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CollectionSeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCollection(collectionId: string) {
    return this.prisma.collectionSeries.findMany({
      where: { collectionId },
      orderBy: [{ isDefault: 'desc' }, { position: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { userComics: true } } },
    });
  }

  async create(collectionId: string, name: string, isDefault = false) {
    const count = await this.prisma.collectionSeries.count({ where: { collectionId } });
    return this.prisma.collectionSeries.create({
      data: { name, collectionId, isDefault, position: count },
    });
  }

  async update(
    id: string,
    data: { name?: string; totalVolumes?: number | null },
  ) {
    await this.findOne(id);
    return this.prisma.collectionSeries.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Unlink user comics from this series before deleting
    await this.prisma.userComic.updateMany({
      where: { collectionSeriesId: id },
      data: { collectionSeriesId: null },
    });
    return this.prisma.collectionSeries.delete({ where: { id } });
  }

  async findOne(id: string) {
    const s = await this.prisma.collectionSeries.findUnique({ where: { id } });
    if (!s) throw new NotFoundException(`CollectionSeries ${id} not found`);
    return s;
  }
}
