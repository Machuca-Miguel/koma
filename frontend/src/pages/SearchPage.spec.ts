import type { ExternalSource, SearchSource } from '@/types'

// ─── Replicate logic from SearchPage ────────────────────────────────────────

type FilterField = 'publisher' | 'creator' | 'issueNumber' | 'year' | 'isbn'

interface AdvancedFilters {
  publisher: string
  creator: string
  issueNumber: string
  year: string
  isbn: string
}

const EMPTY_FILTERS: AdvancedFilters = {
  publisher: '',
  creator: '',
  issueNumber: '',
  year: '',
  isbn: '',
}

const SOURCE_FILTERS: Record<SearchSource, FilterField[]> = {
  all:          ['creator', 'publisher', 'year'],
  comic_vine:   ['issueNumber', 'year'],
  metron:       ['publisher', 'issueNumber', 'year'],
  open_library: ['creator', 'publisher', 'year', 'isbn'],
}

function hasActiveFilters(f: AdvancedFilters): boolean {
  return Object.values(f).some((v) => v.trim() !== '')
}

function hasAnyInput(query: string, filters: AdvancedFilters): boolean {
  return query.trim() !== '' || hasActiveFilters(filters)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('hasActiveFilters', () => {
  it('returns false for empty filters', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
  })

  it('returns true when any filter has a value', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, publisher: 'Marvel' })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, year: '2020' })).toBe(true)
    expect(hasActiveFilters({ ...EMPTY_FILTERS, isbn: '978-00-000' })).toBe(true)
  })

  it('returns false when all filters are empty strings', () => {
    expect(hasActiveFilters({ publisher: '', creator: '', issueNumber: '', year: '', isbn: '' })).toBe(false)
  })

  it('trims whitespace before checking', () => {
    expect(hasActiveFilters({ ...EMPTY_FILTERS, publisher: '   ' })).toBe(false)
  })
})

describe('hasAnyInput', () => {
  it('returns true when query is non-empty', () => {
    expect(hasAnyInput('batman', EMPTY_FILTERS)).toBe(true)
  })

  it('returns true when a filter is active (no query)', () => {
    expect(hasAnyInput('', { ...EMPTY_FILTERS, creator: 'Hergé' })).toBe(true)
  })

  it('returns false when both query and filters are empty', () => {
    expect(hasAnyInput('', EMPTY_FILTERS)).toBe(false)
  })

  it('returns false when query is only whitespace and filters are empty', () => {
    expect(hasAnyInput('   ', EMPTY_FILTERS)).toBe(false)
  })
})

describe('SOURCE_FILTERS config', () => {
  it('Comic Vine shows issueNumber and year only', () => {
    const fields = SOURCE_FILTERS['comic_vine']
    expect(fields).toContain('issueNumber')
    expect(fields).toContain('year')
    expect(fields).not.toContain('publisher')
    expect(fields).not.toContain('creator')
    expect(fields).not.toContain('isbn')
  })

  it('Metron shows publisher, issueNumber, year', () => {
    const fields = SOURCE_FILTERS['metron']
    expect(fields).toContain('publisher')
    expect(fields).toContain('issueNumber')
    expect(fields).toContain('year')
    expect(fields).not.toContain('creator')
    expect(fields).not.toContain('isbn')
  })

  it('Open Library shows creator, publisher, year, isbn', () => {
    const fields = SOURCE_FILTERS['open_library']
    expect(fields).toContain('creator')
    expect(fields).toContain('publisher')
    expect(fields).toContain('year')
    expect(fields).toContain('isbn')
    expect(fields).not.toContain('issueNumber')
  })

  it('all three sources are defined', () => {
    const sources: ExternalSource[] = ['comic_vine', 'metron', 'open_library']
    sources.forEach((s) => expect(SOURCE_FILTERS[s]).toBeDefined())
  })

  it('"all" shows creator, publisher and year but not issueNumber or isbn', () => {
    const fields = SOURCE_FILTERS['all']
    expect(fields).toContain('creator')
    expect(fields).toContain('publisher')
    expect(fields).toContain('year')
    expect(fields).not.toContain('issueNumber')
    expect(fields).not.toContain('isbn')
  })
})
