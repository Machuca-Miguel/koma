import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, Folders, LayoutDashboard, Library, LogOut, Search } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import type { LucideIcon } from 'lucide-react'

const navLinks: { to: string; label: string; Icon: LucideIcon }[] = [
  { to: '/dashboard',    label: 'Inicio',        Icon: LayoutDashboard },
  { to: '/library',      label: 'Mi Biblioteca', Icon: Library         },
  { to: '/search',       label: 'Buscar',        Icon: Search          },
  { to: '/collections',  label: 'Colecciones',   Icon: Folders         },
]

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-60 border-r bg-sidebar flex flex-col shrink-0">
        <div className="flex items-center gap-2.5 p-5">
          <BookOpen className="size-5 text-primary shrink-0" />
          <h1 className="text-xl font-bold tracking-tight">ComicVault</h1>
        </div>

        <Separator />

        <nav className="flex-1 p-3 space-y-1">
          {navLinks.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`
              }
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <Separator />

        {/* Tema */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs text-muted-foreground">Tema</span>
          <ThemeToggle />
        </div>

        <Separator />

        {/* Usuario */}
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-3 px-3">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">
                    {user?.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{user?.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-48">
              <DropdownMenuItem onClick={handleLogout} className="text-destructive gap-2">
                <LogOut className="size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
