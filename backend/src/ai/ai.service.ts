import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

export interface Recommendation {
  title: string;
  author: string;
  why: string;
}

@Injectable()
export class AiService {
  private readonly client = new Anthropic();

  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(userId: string): Promise<Recommendation[]> {
    // Recoger contexto de la biblioteca del usuario
    const userComics = await this.prisma.userComic.findMany({
      where: { userId, collectionStatus: 'IN_COLLECTION' },
      include: {
        comic: {
          include: {
            tags: { include: { tag: true } },
            collectionSeries: true,
          },
        },
      },
      take: 100,
    });

    if (!userComics.length) return [];

    // Extraer series, editoriales, tags y estilos de dibujo únicos
    const seriesSet = new Set<string>();
    const publisherSet = new Set<string>();
    const tagSet = new Set<string>();
    const drawingStyleSet = new Set<string>();

    for (const { comic } of userComics) {
      if (comic.collectionSeries?.name) seriesSet.add(comic.collectionSeries.name);
      else seriesSet.add(comic.title);
      if (comic.publisher) publisherSet.add(comic.publisher);
      if (comic.drawingStyle) drawingStyleSet.add(comic.drawingStyle);
      comic.tags?.forEach(({ tag }) => tagSet.add(tag.name));
    }

    const seriesList = [...seriesSet].slice(0, 20).join(', ');
    const publisherList = [...publisherSet].slice(0, 10).join(', ');
    const tagList = [...tagSet].slice(0, 15).join(', ');
    const drawingStyleList = [...drawingStyleSet].slice(0, 10).join(', ');

    const prompt = `Eres un experto en cómics europeos y americanos. Un coleccionista tiene en su biblioteca las siguientes series: ${seriesList}.
Editoriales favoritas: ${publisherList || 'variadas'}.
Géneros/etiquetas: ${tagList || 'sin especificar'}.
Estilos de dibujo favoritos: ${drawingStyleList || 'no especificado'}.

IMPORTANTE: Para este coleccionista el dibujante y el estilo gráfico son FUNDAMENTALES. Aunque la temática sea interesante, si el estilo de dibujo no encaja con sus preferencias, no lo recomiendes. Prioriza recomendaciones donde el estilo visual sea similar o complementario a los que ya tiene.

Recomiéndale exactamente 6 cómics o series que NO están ya en su colección pero que le van a encantar dado su perfil. Mezcla cómics europeos (franco-belgas, españoles, italianos) con americanos si encajan. Prioriza cómic de autor y novela gráfica europea.

Responde ÚNICAMENTE con un array JSON válido, sin texto adicional, con este formato exacto:
[
  { "title": "Nombre de la obra o serie", "author": "Autor/Dibujante principal", "why": "Una frase corta explicando por qué le gustará dado su colección, mencionando el estilo visual si es relevante" }
]`;

    const message = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw =
      message.content[0].type === 'text' ? message.content[0].text : '';

    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      return JSON.parse(jsonMatch[0]) as Recommendation[];
    } catch {
      return [];
    }
  }
}
