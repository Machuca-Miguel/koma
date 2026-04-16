import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, Compass, Folders, LayoutDashboard, Library, LogOut, Search, Settings } from 'lucide-react'
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

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const navLinks: { to: string; label: string; Icon: LucideIcon }[] = [
    { to: '/dashboard',   label: t('nav.dashboard'),   Icon: LayoutDashboard },
    { to: '/library',     label: t('nav.library'),     Icon: Library         },
    { to: '/search',      label: t('nav.search'),      Icon: Search          },
    { to: '/collections', label: t('nav.collections'), Icon: Folders         },
    { to: '/discover',    label: t('nav.discover'),    Icon: Compass   },
    { to: '/settings',    label: t('nav.settings'),    Icon: Settings  },
  ]

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
          {navLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`
              }
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
