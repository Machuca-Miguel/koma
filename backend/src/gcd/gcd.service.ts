import { Injectable, NotFoundException } from '@nestjs/common';
import { GcdDatabaseService } from './gcd-database.service';
import {
  GcdComic,
  GcdComicDetail,
  GcdSearchResult,
  GcdSeriesInfo,
  GcdPublisherInfo,
} from './gcd-comic.interface';

// ─── MySQL Row Interfaces ─────────────────────────────────────────────────────

interface GcdIssueRow {
  id: number;
  series_name: string;
  number: string | null;
  key_date: string | null;
  publisher_name: string | null;
  valid_isbn: string | null;
  synopsis: string | null;
}

interface GcdStoryCreditRow {
  script: string | null;
  pencils: string | null;
  inks: string | null;
  colors: string | null;
  letters: string | null;
  editing: string | null;
}

interface GcdStoryRow {
  title: string | null;
  page_count: number | null;
  synopsis: string | null;
  genre: string | null;
  characters: string | null;
  feature: string | null;
  first_line: string | null;
  type_name: string | null;
}

interface GcdIssueDetailRow {
  page_count: number | null;
  price: string | null;
  on_sale_date: string | null;
  barcode: string | null;
  isbn: string | null;
}

interface GcdSeriesRow {
  name: string;
  format: string | null;
  year_began: number | null;
  year_ended: number | null;
  issue_count: number | null;
  publication_dates: string | null;
  color: string | null;
  dimensions: string | null;
  paper_stock: string | null;
  binding: string | null;
  publishing_format: string | null;
}

interface GcdPublisherRow {
  name: string;
  year_began: number | null;
  year_ended: number | null;
  url: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class GcdService {
  constructor(private readonly db: GcdDatabaseService) {}

  get available() {
    return this.db.isAvailable;
  }

  async search(
    query: string,
    page = 1,
    filters: { publisher?: string; creator?: string; year?: number } = {},
  ): Promise<GcdSearchResult> {
    if (!this.available) return { data: [], total: 0, page };

    const limit = 20;
    const offset = (page - 1) * limit;
    const params: (string | number)[] = [];
    const where: string[] = ['i.deleted = 0', 's.deleted = 0'];

    if (query) {
      where.push('s.name LIKE ?');
      params.push(`%${query}%`);
    }
    if (filters.publisher) {
      where.push('p.name LIKE ?');
      params.push(`%${filters.publisher}%`);
    }
    if (filters.year) {
      where.push('i.key_date LIKE ?');
      params.push(`${filters.year}%`);
    }

    let creatorJoin = '';
    if (filters.creator) {
      creatorJoin = `
        JOIN gcd_story        st ON st.issue_id = i.id
        JOIN gcd_story_credit sc ON sc.story_id  = st.id
        JOIN gcd_creator       c ON c.id          = sc.creator_id
      `;
      where.push('c.gcd_official_name LIKE ?');
      params.push(`%${filters.creator}%`);
    }

    const whereClause = `WHERE ${where.join(' AND ')}`;

    const rows = await this.db.query<GcdIssueRow>(
      `
      SELECT DISTINCT i.id, s.name AS series_name, i.number,
                      i.key_date, p.name AS publisher_name,
                      i.valid_isbn,
                      (SELECT synopsis FROM gcd_story WHERE issue_id = i.id AND deleted = 0 AND synopsis != '' LIMIT 1) AS synopsis
      FROM  gcd_issue      i
      JOIN  gcd_series     s ON s.id = i.series_id
      JOIN  gcd_publisher  p ON p.id = s.publisher_id
      ${creatorJoin}
      ${whereClause}
      ORDER BY s.name, i.key_date
      LIMIT ? OFFSET ?
    `,
      [...params, limit, offset],
    );

    const countRows = await this.db.query<{ total: number }>(
      `
      SELECT COUNT(DISTINCT i.id) AS total
      FROM  gcd_issue      i
      JOIN  gcd_series     s ON s.id = i.series_id
      JOIN  gcd_publisher  p ON p.id = s.publisher_id
      ${creatorJoin}
      ${whereClause}
    `,
      params,
    );

    return {
      data: rows.map((row) => this.normalize(row)),
      total: Number(countRows[0]?.total ?? 0),
      page,
    };
  }

  async getIssue(issueId: string): Promise<GcdComic> {
    const id = issueId.startsWith('gcd-') ? issueId.slice(4) : issueId;

    const rows = await this.db.query<GcdIssueRow>(
      `
      SELECT i.id, s.name AS series_name, i.number,
             i.key_date, p.name AS publisher_name,
             i.valid_isbn,
             (SELECT synopsis FROM gcd_story WHERE issue_id = i.id AND deleted = 0 AND synopsis != '' LIMIT 1) AS synopsis
      FROM  gcd_issue     i
      JOIN  gcd_series    s ON s.id = i.series_id
      JOIN  gcd_publisher p ON p.id = s.publisher_id
      WHERE i.id = ?
    `,
      [id],
    );

    if (!rows.length)
      throw new NotFoundException(`GCD issue ${issueId} not found`);
    return this.normalize(rows[0]);
  }

  async getIssueDetail(issueId: string): Promise<GcdComicDetail> {
    const base = await this.getIssue(issueId);
    const id = issueId.startsWith('gcd-') ? issueId.slice(4) : issueId;

    const [storyCreditsRows, storyRows, issueRows, seriesRows, publisherRows] =
      await Promise.all([
        // 1. Free-text credits from gcd_story
        this.db.query<GcdStoryCreditRow>(
          `SELECT script, pencils, inks, colors, letters, editing
           FROM gcd_story WHERE issue_id = ? AND deleted = 0`,
          [id],
        ),

        // 2. Stories with enriched fields
        this.db.query<GcdStoryRow>(
          `SELECT s.title, s.page_count, s.synopsis, s.genre, s.characters,
                  s.feature, s.first_line, st.name AS type_name
           FROM gcd_story s
           LEFT JOIN gcd_story_type st ON st.id = s.type_id
           WHERE s.issue_id = ? AND s.deleted = 0
           ORDER BY s.sequence_number`,
          [id],
        ),

        // 3. Extra issue fields
        this.db.query<GcdIssueDetailRow>(
          `SELECT page_count, price, on_sale_date, barcode, isbn
           FROM gcd_issue WHERE id = ?`,
          [id],
        ),

        // 4. Series data
        this.db.query<GcdSeriesRow>(
          `SELECT s.name, s.format, s.year_began, s.year_ended, s.issue_count,
                  s.publication_dates, s.color, s.dimensions, s.paper_stock,
                  s.binding, s.publishing_format
           FROM gcd_issue i
           JOIN gcd_series s ON s.id = i.series_id
           WHERE i.id = ?`,
          [id],
        ),

        // 5. Publisher data
        this.db.query<GcdPublisherRow>(
          `SELECT p.name, p.year_began, p.year_ended, p.url
           FROM gcd_issue i
           JOIN gcd_series s ON s.id = i.series_id
           JOIN gcd_publisher p ON p.id = s.publisher_id
           WHERE i.id = ?`,
          [id],
        ),
      ]);

    // Process credits
    const roleMap = new Map<string, Set<string>>([
      ['Guion', new Set()],
      ['Dibujo', new Set()],
      ['Tintas', new Set()],
      ['Color', new Set()],
      ['Rótulos', new Set()],
      ['Edición', new Set()],
    ]);

    const fieldToRole: Record<keyof GcdStoryCreditRow, string> = {
      script: 'Guion',
      pencils: 'Dibujo',
      inks: 'Tintas',
      colors: 'Color',
      letters: 'Rótulos',
      editing: 'Edición',
    };

    for (const row of storyCreditsRows) {
      for (const [field, role] of Object.entries(fieldToRole)) {
        const raw = row[field as keyof GcdStoryCreditRow]?.trim();
        if (raw && raw !== '?') {
          raw
            .split(/[,;]/)
            .map((n) => n.trim())
            .filter(Boolean)
            .forEach((n) => roleMap.get(role)!.add(n));
        }
      }
    }

    const creators = Array.from(roleMap.entries())
      .filter(([, names]) => names.size > 0)
      .map(([role, names]) => ({ role, names: Array.from(names) }));

    // Process stories
    const stories = storyRows.map((row) => ({
      title: row.title?.trim() || undefined,
      type: row.type_name ?? undefined,
      pageCount: row.page_count ?? undefined,
      synopsis: row.synopsis?.trim() || undefined,
      genre: row.genre?.trim() || undefined,
      characters: row.characters?.trim() || undefined,
      feature: row.feature?.trim() || undefined,
      firstLine: row.first_line?.trim() || undefined,
    }));

    // Issue data
    const issue = issueRows[0];

    // Series data
    const sr = seriesRows[0];
    const seriesInfo: GcdSeriesInfo | undefined = sr
      ? {
          name: sr.name,
          format: sr.format ?? undefined,
          yearBegan: sr.year_began ?? undefined,
          yearEnded: sr.year_ended ?? undefined,
          issueCount: sr.issue_count ?? undefined,
          publicationDates: sr.publication_dates ?? undefined,
          color: sr.color ?? undefined,
          dimensions: sr.dimensions ?? undefined,
          paperStock: sr.paper_stock ?? undefined,
          binding: sr.binding ?? undefined,
          publishingFormat: sr.publishing_format ?? undefined,
        }
      : undefined;

    // Publisher data
    const pr = publisherRows[0];
    const publisherInfo: GcdPublisherInfo | undefined = pr
      ? {
          name: pr.name,
          yearBegan: pr.year_began ?? undefined,
          yearEnded: pr.year_ended ?? undefined,
          url: pr.url ?? undefined,
        }
      : undefined;

    return {
      ...base,
      pageCount: issue?.page_count ?? undefined,
      price: issue?.price?.trim() || undefined,
      onSaleDate: issue?.on_sale_date ?? undefined,
      barcode: issue?.barcode ?? undefined,
      isbn: issue?.isbn ?? undefined,
      creators,
      stories,
      seriesInfo,
      publisherInfo,
    };
  }

  private normalize(row: GcdIssueRow): GcdComic {
    const yearStr = row.key_date?.split('-')[0];
    const year = yearStr ? parseInt(yearStr, 10) : undefined;

    return {
      externalId: `gcd-${row.id}`,
      title: row.series_name ?? 'Sin título',
      issueNumber: row.number ?? undefined,
      publisher: row.publisher_name ?? undefined,
      year: isNaN(year as number) ? undefined : year,
      synopsis: row.synopsis?.trim() || undefined,
      coverUrl: row.valid_isbn
        ? `https://covers.openlibrary.org/b/isbn/${row.valid_isbn}-M.jpg`
        : undefined,
    };
  }
}
