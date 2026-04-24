import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { AuthPage } from '@/pages/auth/AuthPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LibraryPage } from '@/pages/LibraryPage'
import { LibrarySeriesPage } from '@/pages/LibrarySeriesPage'
import { SearchPage } from '@/pages/SearchPage'
import { CollectionsPage } from '@/pages/CollectionsPage'
import { CollectionDetailPage } from '@/pages/CollectionDetailPage'
import { ComicDetailPage } from '@/pages/ComicDetailPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { DiscoverPage } from '@/pages/DiscoverPage'
import { ExternalComicDetailPage } from '@/pages/ExternalComicDetailPage'
import { SeriesDetailPage } from '@/pages/SeriesDetailPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<PublicRoute><AuthPage defaultMode="login" /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><AuthPage defaultMode="register" /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Rutas protegidas */}
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="library/collections" element={<CollectionsPage />} />
          <Route path="library/series" element={<LibrarySeriesPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="collections" element={<Navigate to="/library/collections" replace />} />
          <Route path="collections/:id" element={<CollectionDetailPage />} />
          <Route path="comics/:id" element={<ComicDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="search/book/:isbn" element={<ExternalComicDetailPage />} />
          <Route path="series/:id" element={<SeriesDetailPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
