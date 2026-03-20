export interface ExternalComic {
  externalId: string;
  externalApi: 'comic_vine' | 'metron';
  title: string;
  issueNumber?: string;
  publisher?: string;
  year?: number;
  synopsis?: string;
  coverUrl?: string;
}

export interface ExternalSearchResult {
  data: ExternalComic[];
  total: number;
  page: number;
}
