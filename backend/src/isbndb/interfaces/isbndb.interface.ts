// ─── Raw ISBNDB API response shapes ───────────────────────────────────────────

export interface IsbndbBook {
  isbn: string;
  isbn13?: string;
  title: string;
  title_long?: string;
  authors?: string[];
  publisher?: string;
  date_published?: string;
  language?: string;
  synopsis?: string;
  overview?: string;
  image?: string;
  pages?: number;
  subjects?: string[];
  binding?: string;
  msrp?: string | number;
  edition?: string;
  dimensions?: string;
  dimensions_structured?: {
    length?: { unit: string; value: number };
    width?: { unit: string; value: number };
    height?: { unit: string; value: number };
    weight?: { unit: string; value: number };
  };
  other_isbns?: { isbn: string; binding: string }[];
  related?: { type: string }[];
  reviews?: string[];
  excerpt?: string;
}

export interface IsbndbBookResponse {
  book: IsbndbBook;
}

export interface IsbndbBooksResponse {
  total: number;
  books: IsbndbBook[];
  page?: number;
}

export interface IsbndbAuthorsResponse {
  total: number;
  authors: string[];
  page: number;
}

export interface IsbndbAuthorBooksResponse {
  author: string;
  books: IsbndbBook[];
}

export interface IsbndbPublishersResponse {
  total: number;
  publishers: string[];
  page: number;
}

export interface IsbndbPublisherBooksResponse {
  publisher: string;
  books: IsbndbBook[];
}

export interface IsbndbSubjectsResponse {
  total: number;
  subjects: string[];
  page: number;
}

export interface IsbndbSubjectBooksResponse {
  subject: string;
  books: IsbndbBook[];
}

export interface IsbndbStatsResponse {
  time_seconds?: number;
  activeISBNs?: number;
  books?: number;
  authors?: number;
  publishers?: number;
  subjects?: number;
  [key: string]: unknown;
}

export interface IsbndbKeyResponse {
  access_level?: string;
  daily_limit?: number;
  requests_today?: number;
  requests_remaining?: number;
  [key: string]: unknown;
}

export interface IsbndbFeedResponse {
  total?: number;
  page?: number;
  books?: IsbndbBook[];
  [key: string]: unknown;
}
