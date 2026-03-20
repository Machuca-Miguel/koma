import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComicVineService } from './providers/comic-vine.service';
import { MetronService } from './providers/metron.service';
import { ExternalSource } from './dto/search-external.dto';
import { ExternalComic, ExternalSearchResult } from './external-comic.interface';

@Injectable()
export class ExternalComicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comicVine: ComicVineService,
    private readonly metron: MetronService,
  ) {}

  async search(query: string, source: ExternalSource, page = 1): Promise<ExternalSearchResult> {
    if (source === ExternalSource.COMIC_VINE) {
      return this.comicVine.search(query, page);
    }
    return this.metron.search(query, page);
  }

  async import(externalId: string, source: ExternalSource) {
    // Si ya existe en la BD, lo devolvemos directamente
    const existing = await this.prisma.comic.findFirst({
      where: { externalId, externalApi: source },
    });
    if (existing) return { comic: existing, imported: false };

    // Obtenemos los datos de la API externa
    const data = await this.fetchOne(externalId, source);

    // Lo guardamos en la BD
    const comic = await this.prisma.comic.create({
      data: {
        title: data.title,
        issueNumber: data.issueNumber,
        publisher: data.publisher,
        year: data.year,
        synopsis: data.synopsis,
        coverUrl: data.coverUrl,
        externalId: data.externalId,
        externalApi: data.externalApi,
      },
    });

    return { comic, imported: true };
  }

  private async fetchOne(externalId: string, source: ExternalSource): Promise<ExternalComic> {
    if (source === ExternalSource.COMIC_VINE) {
      const data = await this.comicVine.getIssue(externalId);
      if (!data) throw new NotFoundException(`Cómic ${externalId} no encontrado en Comic Vine`);
      return data;
    }

    const data = await this.metron.getIssue(externalId);
    if (!data) throw new NotFoundException(`Cómic ${externalId} no encontrado en Metron`);
    return data;
  }
}
