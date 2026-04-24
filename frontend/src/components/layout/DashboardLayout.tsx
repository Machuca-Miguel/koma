import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Compass, Folders, LayoutDashboard, Library, LogOut, Search, Settings, Layers, LayoutGrid } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import type { LucideIcon } from 'lucide-react'

const navLinkCls = (isActive: boolean) =>
  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
    isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
  }`

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const bottomLinks: { to: string; label: string; Icon: LucideIcon }[] = [
    { to: '/search',   label: t('nav.search'),   Icon: Search   },
    { to: '/discover', label: t('nav.discover'), Icon: Compass  },
    { to: '/settings', label: t('nav.settings'), Icon: Settings },
  ]

  const libraryLinks: { to: string; label: string; Icon: LucideIcon; end?: boolean }[] = [
    { to: '/library/collections', label: t('nav.myCollections'), Icon: Folders    },
    { to: '/library/series',      label: t('nav.mySeries'),      Icon: Layers     },
    { to: '/library',             label: t('nav.comics'),        Icon: LayoutGrid, end: true },
  ]

  const isInLibrary = location.pathname.startsWith('/library')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh flex">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-sidebar flex flex-col shrink-0">
        {/* Logo + theme toggle */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="size-5 text-primary shrink-0" />
            <span className="text-lg font-bold tracking-tight">Koma</span>
          </div>
          <ThemeToggle />
        </div>

        <Separator />

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            className={({ isActive }) => navLinkCls(isActive)}
          >
            <LayoutDashboard className="size-4 shrink-0" />
            {t('nav.dashboard')}
          </NavLink>

          {/* Mi Biblioteca section */}
          <div>
            <div className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
              isInLibrary ? 'text-sidebar-foreground font-medium' : 'text-sidebar-foreground/60'
            }`}>
              <Library className="size-4 shrink-0" />
              {t('nav.library')}
            </div>
            <div className="ml-3 pl-3 border-l border-sidebar-border/40 space-y-0.5 mt-0.5">
              {libraryLinks.map(({ to, label, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => navLinkCls(isActive)}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Remaining links */}
          {bottomLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => navLinkCls(isActive)}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Separator />

        {/* User menu */}
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-sidebar-accent transition-colors cursor-pointer outline-none">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                  {user?.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate flex-1 text-left text-sidebar-foreground">
                {user?.username}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-48">
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive gap-2 cursor-pointer"
              >
                <LogOut className="size-4" />
                {t('nav.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="px-8 pt-5 pb-0 ">
          <Breadcrumbs />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
