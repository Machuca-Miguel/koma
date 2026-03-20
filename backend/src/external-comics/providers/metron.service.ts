import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalComic, ExternalSearchResult } from '../external-comic.interface';

const BASE_URL = 'https://metron.cloud/api';

@Injectable()
export class MetronService {
  private readonly authHeader: string;

  constructor(private readonly config: ConfigService) {
    const username = this.config.get<string>('METRON_USERNAME') ?? '';
    const password = this.config.get<string>('METRON_PASSWORD') ?? '';
    this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  }

  private async fetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams(params);
    const url = `${BASE_URL}${path}/?${qs}`;

    const res = await fetch(url, {
      headers: {
        Authorization: this.authHeader,
        'User-Agent': 'ComicVault/1.0',
      },
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`Metron error: ${res.status}`);
    }

    return res.json() as Promise<T>;
  }

  async search(query: string, page = 1): Promise<ExternalSearchResult> {
    const data = await this.fetch<any>('/issue', {
      search: query,
      page: String(page),
    });

    return {
      data: (data.results ?? []).map(this.normalize),
      total: data.count ?? 0,
      page,
    };
  }

  async getIssue(issueId: string): Promise<ExternalComic> {
    const data = await this.fetch<any>(`/issue/${issueId}`);
    return this.normalize(data);
  }

  private normalize(issue: any): ExternalComic {
    const yearStr = issue.cover_date?.split('-')[0];
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    return {
      externalId: String(issue.id),
      externalApi: 'metron',
      title: issue.series?.name ?? 'Sin título',
      issueNumber: issue.number ?? undefined,
      publisher: issue.series?.publisher?.name ?? undefined,
      year: isNaN(year as number) ? undefined : year,
      synopsis: issue.desc?.trim() || undefined,
      coverUrl: issue.image ?? undefined,
    };
  }
}
