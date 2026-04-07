import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface GcdSeriesData {
  name: string;
  publisher?: string;
  yearBegan?: number;
  yearEnded?: number;
  issueCount?: number;
  coverUrl?: string;
}

@Injectable()
export class SeriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreateFromGcd(gcdSeriesId: number, data: GcdSeriesData) {
    return this.prisma.series.upsert({
      where: { gcdSeriesId },
      update: {
        totalIssues: data.issueCount,
        ...(data.coverUrl && { coverUrl: data.coverUrl }),
      },
      create: {
        name: data.name,
        publisher: data.publisher,
        yearBegan: data.yearBegan,
        yearEnded: data.yearEnded,
        totalIssues: data.issueCount,
        gcdSeriesId,
        coverUrl: data.coverUrl,
        isOngoing: !data.yearEnded,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.series.findUnique({ where: { id } });
  }
}
