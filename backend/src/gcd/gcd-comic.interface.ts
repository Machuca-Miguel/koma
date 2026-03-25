export interface GcdComic {
  externalId: string; // "gcd-{id}"
  title: string;
  issueNumber?: string;
  publisher?: string;
  year?: number;
  synopsis?: string;
  coverUrl?: string; // Open Library si hay valid_isbn
}

export interface GcdSearchResult {
  data: GcdComic[];
  total: number;
  page: number;
}

export interface GcdCreatorRole {
  role: string;
  names: string[];
}

export interface GcdStory {
  title?: string;
  type?: string;
  pageCount?: number;
  synopsis?: string;
  genre?: string;
  characters?: string;
  feature?: string;
  firstLine?: string;
}

export interface GcdSeriesInfo {
  name: string;
  format?: string;
  yearBegan?: number;
  yearEnded?: number;
  issueCount?: number;
  publicationDates?: string;
  color?: string;
  dimensions?: string;
  paperStock?: string;
  binding?: string;
  publishingFormat?: string;
}

export interface GcdPublisherInfo {
  name: string;
  yearBegan?: number;
  yearEnded?: number;
  url?: string;
}

export interface GcdComicDetail extends GcdComic {
  pageCount?: number;
  price?: string;
  onSaleDate?: string;
  barcode?: string;
  isbn?: string;
  creators: GcdCreatorRole[];
  stories: GcdStory[];
  seriesInfo?: GcdSeriesInfo;
  publisherInfo?: GcdPublisherInfo;
}
