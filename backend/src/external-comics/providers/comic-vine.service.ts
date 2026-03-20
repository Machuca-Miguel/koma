import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExternalComic, ExternalSearchResult } from '../external-comic.interface';

const BASE_URL = 'https://comicvine.gamespot.com/api';
const FIELD_LIST = 'id,name,issue_number,volume,cover_date,image,description,publisher';

@Injectable()
export class ComicVineService {
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('COMIC_VINE_API_KEY') ?? '';
  }

  private async fetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams({
      api_key: this.apiKey,
      format: 'json',
      ...params,
    });

    const res = await fetch(`${BASE_URL}${path}?${qs}`, {
      headers: { 'User-Agent': 'ComicVault/1.0' },
    });

    if (!res.ok) {
      throw new InternalServerErrorException(`Comic Vine error: ${res.status}`);
    }

    const json = (await res.json()) as any;
    if (json.status_code !== 1) {
      throw new InternalServerErrorException(`Comic Vine: ${json.error}`);
    }

    return json as T;
  }

  async search(query: string, page = 1): Promise<ExternalSearchResult> {
    const limit = 20;
    const offset = (page - 1) * limit;

    const data = await this.fetch<any>('/issues/', {
      filter: `name:${query}`,
      field_list: FIELD_LIST,
      limit: String(limit),
      offset: String(offset),
    });

    return {
      data: (data.results ?? []).map(this.normalize),
      total: data.number_of_total_results ?? 0,
      page,
    };
  }

  async getIssue(issueId: string): Promise<ExternalComic> {
    // issueId puede venir como "4000-123456" o solo "123456"
    const id = issueId.startsWith('4000-') ? issueId : `4000-${issueId}`;
    const data = await this.fetch<any>(`/issue/${id}/`, {
      field_list: FIELD_LIST,
    });
    return this.normalize(data.results);
  }

  private normalize(issue: any): ExternalComic {
    const yearStr = issue.cover_date?.split('-')[0];
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    // Comic Vine devuelve description con HTML, lo limpiamos
    const synopsis = issue.description
      ? issue.description.replace(/<[^>]*>/g, '').trim() || undefined
      : undefined;

    return {
      externalId: `4000-${issue.id}`,
      externalApi: 'comic_vine',
      title: issue.volume?.name ?? issue.name ?? 'Sin título',
      issueNumber: issue.issue_number ?? undefined,
      publisher: issue.publisher?.name ?? undefined,
      year: isNaN(year as number) ? undefined : year,
      synopsis,
      coverUrl: issue.image?.medium_url ?? undefined,
    };
  }
}
