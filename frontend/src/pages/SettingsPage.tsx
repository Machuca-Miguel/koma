import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import i18next from 'i18next'
import { useNavigate } from 'react-router-dom'
import {
  User, Palette, Database, Shield, Library,
  Globe, Download, Upload, Sun, Moon, Monitor, TriangleAlert,
} from 'lucide-react'
import { usersApi } from '@/api/users'
import { libraryApi } from '@/api/library'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-primary">{icon}</span>
      <span className="section-label">{label}</span>
    </div>
  )
}

function ThemeCard({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string
  icon: React.ElementType
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${
        active
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
      }`}
    >
      <Icon className="size-5" />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { t } = useTranslation()
  const { user, updateUser, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  // ── Username form ──────────────────────────────────────────────────────────

  const usernameSchema = z.object({
    username: z
      .string()
      .min(3, t('settings.account.validation.tooShort'))
      .max(30, t('settings.account.validation.tooLong')),
  })
  type UsernameForm = z.infer<typeof usernameSchema>

  const {
    register: regUsername,
    handleSubmit: handleUsername,
    formState: { errors: usernameErrors },
  } = useForm<UsernameForm>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: user?.username ?? '' },
  })

  const usernameMutation = useMutation({
    mutationFn: (data: UsernameForm) => usersApi.updateProfile({ username: data.username }),
    onSuccess: (updated) => {
      updateUser(updated)
      toast.success(t('settings.account.usernameSuccess'))
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 409) toast.error(t('settings.account.usernameTaken'))
      else toast.error(t('settings.account.usernameError'))
    },
  })

  // ── Language ───────────────────────────────────────────────────────────────

  const langMutation = useMutation({
    mutationFn: (lang: string) => usersApi.updateProfile({ language: lang }),
    onSuccess: (updated) => updateUser(updated),
    onError: () => toast.error(t('settings.appearance.languageError')),
  })

  const handleLanguageChange = (lang: string) => {
    const prev = i18next.language
    void i18next.changeLanguage(lang)
    localStorage.setItem('i18n-lang', lang)
    langMutation.mutate(lang, {
      onError: () => {
        void i18next.changeLanguage(prev)
        localStorage.setItem('i18n-lang', prev)
      },
    })
  }

  // ── Password form ──────────────────────────────────────────────────────────

  const passwordSchema = z
    .object({
      currentPassword: z.string().min(1, t('settings.security.validation.currentRequired')),
      newPassword: z.string().min(6, t('settings.security.validation.tooShort')),
      confirmPassword: z.string(),
    })
    .refine((d) => d.newPassword === d.confirmPassword, {
      message: t('settings.security.validation.mustMatch'),
      path: ['confirmPassword'],
    })
  type PasswordForm = z.infer<typeof passwordSchema>

  const {
    register: regPassword,
    handleSubmit: handlePassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) })

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      usersApi.updatePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
    onSuccess: () => { toast.success(t('settings.security.passwordSuccess')); resetPassword() },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) toast.error(t('settings.security.wrongCurrentPassword'))
      else toast.error(t('settings.security.passwordError'))
    },
  })

  // ── Export ─────────────────────────────────────────────────────────────────

  const [exporting, setExporting] = useState<'csv' | 'json' | null>(null)

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(format)
    try {
      const response = await libraryApi.export(format)
      const blob = new Blob([response.data])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `koma-library.${format}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error(t('settings.data.exportError'))
    } finally {
      setExporting(null)
    }
  }

  // ── Import CSV ─────────────────────────────────────────────────────────────

  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await libraryApi.importCsv(file)
      toast.success(t('settings.data.importSuccess', { imported: result.imported, skipped: result.skipped }))
    } catch {
      toast.error(t('settings.data.importError'))
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Library preferences ────────────────────────────────────────────────────

  const [libView, setLibView] = useState(localStorage.getItem('lib-view') ?? 'collections')
  const [libSort, setLibSort] = useState(localStorage.getItem('lib-sort') ?? 'added_desc')

  const handleLibView = (v: string | null) => { if (v) { setLibView(v); localStorage.setItem('lib-view', v) } }
  const handleLibSort = (v: string | null) => { if (v) { setLibSort(v); localStorage.setItem('lib-sort', v) } }

  // ── Delete account ─────────────────────────────────────────────────────────

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteAccount(),
    onSuccess: () => {
      toast.success(t('settings.danger.successRedirect'))
      logout()
      navigate('/login')
    },
    onError: () => toast.error(t('settings.danger.error')),
  })

  // ── Theme options ──────────────────────────────────────────────────────────

  const themeOptions: { value: string; label: string; icon: React.ElementType }[] = [
    { value: 'light',  label: t('settings.appearance.themeLight'),  icon: Sun     },
    { value: 'dark',   label: t('settings.appearance.themeDark'),   icon: Moon    },
    { value: 'system', label: t('settings.appearance.themeSystem'), icon: Monitor },
  ]

  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??'

  return (
    <PageContainer size="narrow">
      <PageHeader title={t('settings.title')} description={t('settings.subtitle')} />

      {/* ── Profile card ──────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="p-5 flex items-center gap-4">
          <Avatar className="size-14 shrink-0">
            <AvatarFallback className="text-base font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base leading-tight truncate">{user?.username}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
          <span className="section-label shrink-0">Member</span>
        </CardContent>
      </Card>

      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <SectionTitle icon={<User className="size-3.5" />} label={t('settings.sections.account')} />

            <div className="space-y-1.5">
              <Label htmlFor="email">{t('settings.account.emailLabel')}</Label>
              <Input id="email" value={user?.email ?? ''} disabled />
              <p className="text-xs text-muted-foreground">{t('settings.account.emailHint')}</p>
            </div>

            <form onSubmit={handleUsername((d) => usernameMutation.mutate(d))} className="space-y-1.5">
              <Label htmlFor="username">{t('settings.account.usernameLabel')}</Label>
              <div className="flex gap-2">
                <Input
                  id="username"
                  placeholder={t('settings.account.usernamePlaceholder')}
                  {...regUsername('username')}
                />
                <Button type="submit" disabled={usernameMutation.isPending}>
                  {usernameMutation.isPending ? t('common.saving') : t('settings.account.saveUsername')}
                </Button>
              </div>
              {usernameErrors.username && (
                <p className="text-xs text-destructive">{usernameErrors.username.message}</p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <SectionTitle icon={<Palette className="size-3.5" />} label={t('settings.sections.appearance')} />

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Globe className="size-3.5 text-muted-foreground" />
                {t('settings.appearance.languageLabel')}
              </Label>
              <Select value={i18next.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('settings.appearance.themeLabel')}</Label>
              <div className="flex gap-2">
                {themeOptions.map(({ value, label, icon }) => (
                  <ThemeCard
                    key={value}
                    label={label}
                    icon={icon}
                    active={theme === value}
                    onClick={() => setTheme(value)}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Library preferences ──────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <SectionTitle icon={<Library className="size-3.5" />} label={t('settings.sections.library')} />

            <div className="space-y-1.5">
              <Label>{t('settings.library.defaultView')}</Label>
              <Select value={libView} onValueChange={handleLibView}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collections">{t('settings.library.viewCollections')}</SelectItem>
                  <SelectItem value="series">{t('settings.library.viewSeries')}</SelectItem>
                  <SelectItem value="grid">{t('settings.library.viewGrid')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('settings.library.defaultViewHint')}</p>
            </div>

            <div className="space-y-1.5">
              <Label>{t('settings.library.defaultSort')}</Label>
              <Select value={libSort} onValueChange={handleLibSort}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="added_desc">{t('settings.library.sortAdded')}</SelectItem>
                  <SelectItem value="title_asc">{t('settings.library.sortTitle')}</SelectItem>
                  <SelectItem value="series_asc">{t('settings.library.sortSeries')}</SelectItem>
                  <SelectItem value="year_asc">{t('settings.library.sortYear')}</SelectItem>
                  <SelectItem value="rating_desc">{t('settings.library.sortRating')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('settings.library.defaultSortHint')}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Security ─────────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <SectionTitle icon={<Shield className="size-3.5" />} label={t('settings.sections.security')} />

            <form onSubmit={handlePassword((d) => passwordMutation.mutate(d))} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">{t('settings.security.currentPasswordLabel')}</Label>
                <Input id="currentPassword" type="password" {...regPassword('currentPassword')} />
                {passwordErrors.currentPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">{t('settings.security.newPasswordLabel')}</Label>
                <Input id="newPassword" type="password" {...regPassword('newPassword')} />
                {passwordErrors.newPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">{t('settings.security.confirmPasswordLabel')}</Label>
                <Input id="confirmPassword" type="password" {...regPassword('confirmPassword')} />
                {passwordErrors.confirmPassword && (
                  <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" disabled={passwordMutation.isPending} className="mt-1">
                {passwordMutation.isPending ? t('settings.security.savingPassword') : t('settings.security.savePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Data ─────────────────────────────────────────────────────────── */}
        <Card className="md:col-span-2">
          <CardContent className="p-6 space-y-4">
            <SectionTitle icon={<Database className="size-3.5" />} label={t('settings.sections.data')} />

            <p className="text-sm text-muted-foreground">{t('settings.data.hint')}</p>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2" disabled={exporting !== null} onClick={() => handleExport('csv')}>
                <Download className="size-4" />
                {exporting === 'csv' ? t('settings.data.exporting') : t('settings.data.exportCsv')}
              </Button>
              <Button type="button" variant="outline" className="gap-2" disabled={exporting !== null} onClick={() => handleExport('json')}>
                <Download className="size-4" />
                {exporting === 'json' ? t('settings.data.exporting') : t('settings.data.exportJson')}
              </Button>
              <Button type="button" variant="outline" className="gap-2" disabled={importing} onClick={() => fileInputRef.current?.click()}>
                <Upload className="size-4" />
                {importing ? t('settings.data.importing') : t('settings.data.importCsv')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleImport}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Danger zone ──────────────────────────────────────────────────── */}
        <Card className="md:col-span-2 border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 flex items-center justify-between gap-6">
            <div className="flex items-start gap-3">
              <TriangleAlert className="size-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-destructive">{t('settings.sections.danger')}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t('settings.danger.hint')}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="destructive"
              className="shrink-0"
              onClick={() => setDeleteDialogOpen(true)}
            >
              {t('settings.danger.button')}
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* ── Delete account dialog ──────────────────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={(v) => { if (!v) { setDeleteDialogOpen(false); setDeleteConfirm('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">{t('settings.danger.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('settings.danger.dialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder={t('settings.danger.confirmPlaceholder')}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteConfirm('') }}>
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirm !== user?.username || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? t('settings.danger.deleting') : t('settings.danger.confirmButton')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
