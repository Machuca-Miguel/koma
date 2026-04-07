import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from 'next-themes'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import i18next from 'i18next'
import { usersApi } from '@/api/users'
import { libraryApi } from '@/api/library'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PageContainer } from '@/components/layout/PageContainer'

export function SettingsPage() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const { theme, setTheme } = useTheme()

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
      if (status === 409) {
        toast.error(t('settings.account.usernameTaken'))
      } else {
        toast.error(t('settings.account.usernameError'))
      }
    },
  })

  // ── Language change ────────────────────────────────────────────────────────

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
    onSuccess: () => {
      toast.success(t('settings.security.passwordSuccess'))
      resetPassword()
    },
    onError: (err: unknown) => {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 401) {
        toast.error(t('settings.security.wrongCurrentPassword'))
      } else {
        toast.error(t('settings.security.passwordError'))
      }
    },
  })

  // ── Export ────────────────────────────────────────────────────────────────

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

  const themeOptions: { value: string; label: string }[] = [
    { value: 'light', label: t('settings.appearance.themeLight') },
    { value: 'dark', label: t('settings.appearance.themeDark') },
    { value: 'system', label: t('settings.appearance.themeSystem') },
  ]

  return (
    <PageContainer size="xs">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* ── Section 1: Account ─────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('settings.sections.account')}
            </h2>

            <Separator />

            {/* Email — read-only */}
            <div className="space-y-1.5">
              <Label htmlFor="email">{t('settings.account.emailLabel')}</Label>
              <Input id="email" value={user?.email ?? ''} disabled />
              <p className="text-xs text-muted-foreground">{t('settings.account.emailHint')}</p>
            </div>

            {/* Username */}
            <form
              onSubmit={handleUsername((d) => usernameMutation.mutate(d))}
              className="space-y-1.5"
            >
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

        {/* ── Section 2: Appearance ──────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('settings.sections.appearance')}
            </h2>

            <Separator />

            {/* Language */}
            <div className="space-y-1.5">
              <Label>{t('settings.appearance.languageLabel')}</Label>
              <Select value={i18next.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('settings.appearance.languageHint')}</p>
            </div>

            {/* Theme */}
            <div className="space-y-1.5">
              <Label>{t('settings.appearance.themeLabel')}</Label>
              <div className="flex gap-2">
                {themeOptions.map(({ value, label }) => (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={theme === value ? 'default' : 'outline'}
                    onClick={() => setTheme(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('settings.appearance.themeHint')}</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 3: Data ───────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('settings.sections.data')}
            </h2>

            <Separator />

            <div className="space-y-1.5">
              <p className="text-sm text-muted-foreground">{t('settings.data.hint')}</p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={exporting !== null}
                  onClick={() => handleExport('csv')}
                >
                  {exporting === 'csv' ? t('settings.data.exporting') : t('settings.data.exportCsv')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={exporting !== null}
                  onClick={() => handleExport('json')}
                >
                  {exporting === 'json' ? t('settings.data.exporting') : t('settings.data.exportJson')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Section 4: Security ────────────────────────────────────────── */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('settings.sections.security')}
            </h2>

            <Separator />

            <form
              onSubmit={handlePassword((d) => passwordMutation.mutate(d))}
              className="space-y-3"
            >
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
                {passwordMutation.isPending
                  ? t('settings.security.savingPassword')
                  : t('settings.security.savePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
