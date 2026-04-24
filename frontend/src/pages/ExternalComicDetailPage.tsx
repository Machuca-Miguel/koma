import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft, BookOpen, Copy, Check, Hash, Globe, FileText,
  Users, Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { isbndbApi } from '@/api/isbndb'
import type { IsbndbBook } from '@/api/isbndb'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PageContainer } from '@/components/layout/PageContainer'
import { AddToSheet } from '@/components/features/AddToSheet'

function getYear(book: IsbndbBook) {
  if (!book.date_published) return undefined
  const y = parseInt(book.date_published.slice(0, 4), 10)
  return isNaN(y) ? undefined : y
}

function IsbnCopyButton({ isbn }: { isbn: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(isbn)
    setCopied(true)
    toast.success(t('isbndb.isbnCopied'))
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-sm font-mono text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Hash className="size-3.5" />}
      {isbn}
      {!copied && <Copy className="size-3 opacity-50" />}
    </button>
  )
}

export function ExternalComicDetailPage() {
  const { isbn } = useParams<{ isbn: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [sheetOpen, setSheetOpen] = useState(false)

  const { data: book, isLoading, isError } = useQuery({
    queryKey: ['isbndb', 'book', isbn],
    queryFn: () => isbndbApi.getBook(isbn!),
    enabled: !!isbn,
    retry: false,
    staleTime: 1000 * 60 * 10,
  })

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="shrink-0 w-40 h-[224px] rounded-xl" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </PageContainer>
    )
  }

  if (isError || !book) {
    return (
      <PageContainer>
        <Button variant="ghost" size="sm" className="gap-1.5 mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />{t('common.back')}
        </Button>
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <BookOpen className="size-10 opacity-30" />
          <p className="font-medium">{t('isbndb.noIsbnResult')}</p>
          <p className="text-sm">{t('isbndb.isbnEmptyState')}</p>
        </div>
      </PageContainer>
    )
  }

  const displayIsbn = book.isbn13 ?? book.isbn
  const year = getYear(book)
  const metaItems = [
    book.publisher,
    year ? String(year) : undefined,
    book.pages ? t('isbndb.pages', { count: book.pages }) : undefined,
    book.language ? book.language.toUpperCase() : undefined,
  ].filter(Boolean)

  const synopsis = book.synopsis ?? book.overview

  return (
    <PageContainer>
      {/* Back */}
      <Button variant="ghost" size="sm" className="gap-1.5 mb-6" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" />{t('common.back')}
      </Button>

      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {/* Cover */}
        <div className="shrink-0 mx-auto sm:mx-0 w-36 sm:w-44 rounded-xl overflow-hidden shadow-lg bg-muted flex items-center justify-center aspect-[2/3]">
          {book.image ? (
            <img src={book.image} alt={book.title} className="w-full h-full object-cover" />
          ) : (
            <BookOpen className="size-10 text-muted-foreground/30" />
          )}
        </div>

        {/* Info block */}
        <div className="flex-1 min-w-0 space-y-3">
          <h1 className="text-2xl font-bold leading-tight">{book.title}</h1>
          {book.title_long && book.title_long !== book.title && (
            <p className="text-sm text-muted-foreground italic">{book.title_long}</p>
          )}

          {/* Meta row */}
          {metaItems.length > 0 && (
            <p className="text-sm text-muted-foreground">{metaItems.join(' · ')}</p>
          )}

          {/* ISBN copiable */}
          {displayIsbn && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">ISBN</span>
              <IsbnCopyButton isbn={displayIsbn} />
            </div>
          )}

          {/* Binding */}
          {book.binding && (
            <div className="flex items-center gap-2">
              <FileText className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm">{book.binding}</span>
            </div>
          )}

          {/* Language */}
          {book.language && (
            <div className="flex items-center gap-2">
              <Globe className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm">{book.language.toUpperCase()}</span>
            </div>
          )}

          {/* Rating */}
          {book.msrp && (
            <div className="flex items-center gap-2">
              <Star className="size-3.5 text-muted-foreground shrink-0" />
              <span className="text-sm">{book.msrp}</span>
            </div>
          )}

          {/* Authors tags */}
          {book.authors && book.authors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <Users className="size-3.5 text-muted-foreground shrink-0" />
              {book.authors.map((a) => (
                <Badge key={a} variant="secondary" className="text-xs">{a}</Badge>
              ))}
            </div>
          )}

          {/* Subjects */}
          {book.subjects && book.subjects.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {book.subjects.map((s) => (
                <Badge key={s} variant="outline" className="text-[11px]">{s}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Synopsis */}
      {synopsis && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-2">{t('comicDetail.synopsis')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{synopsis}</p>
        </div>
      )}

      {/* CTA */}
      <div className="sticky bottom-6 flex justify-center">
        <Button size="lg" className="shadow-lg gap-2" onClick={() => setSheetOpen(true)}>
          <BookOpen className="size-4" />
          {t('isbndb.addToLibrary')}
        </Button>
      </div>

      <AddToSheet
        book={book}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </PageContainer>
  )
}
