import { useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import type { Collection, Comic } from '@/types'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation()
  const params = useParams<{ id?: string }>()
  const { t } = useTranslation()
  const qc = useQueryClient()

  const home: BreadcrumbItem = { label: t('nav.dashboard'), href: '/dashboard' }
  const libraryHome: BreadcrumbItem = { label: t('nav.library'), href: '/library' }

  const path = location.pathname

  if (path === '/dashboard') {
    return [{ label: t('nav.dashboard') }]
  }

  if (path === '/library') {
    return [home, { label: t('nav.library') }]
  }

  if (path === '/library/series') {
    return [home, libraryHome, { label: t('nav.mySeries') }]
  }

  if (path === '/library/collections') {
    return [home, libraryHome, { label: t('nav.myCollections') }]
  }

  if (path.startsWith('/series/') && params.id) {
    const series = qc.getQueryData<{ seriesName: string }>(['series-detail', params.id])
    return [
      home,
      { label: t('nav.mySeries'), href: '/library/series' },
      { label: series?.seriesName ?? '…' },
    ]
  }

  if (path === '/search') {
    return [home, { label: t('nav.search') }]
  }

  if (path === '/collections') {
    return [home, { label: t('nav.myCollections') }]
  }

  if (path.startsWith('/collections/') && params.id) {
    const col = qc.getQueryData<Collection>(['collection', params.id])
    return [
      home,
      { label: t('nav.myCollections'), href: '/library/collections' },
      { label: col?.name ?? '…' },
    ]
  }

  if (path.startsWith('/comics/') && params.id) {
    const comic = qc.getQueryData<Comic>(['comic', params.id])
    return [
      home,
      { label: comic?.title ?? '…' },
    ]
  }

  if (path === '/discover') {
    return [home, { label: t('nav.discover') }]
  }

  if (path === '/settings') {
    return [home, { label: t('nav.settings') }]
  }

  return [home]
}
