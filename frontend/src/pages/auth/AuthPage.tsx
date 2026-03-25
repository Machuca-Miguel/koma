import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'
import { authApi } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

// ─── Login Form ──────────────────────────────────────────────────────────────

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const loginSchema = z.object({
    email: z.email(t('auth.validation.invalidEmail')),
    password: z.string().min(1, t('auth.validation.passwordRequired')),
  })
  type LoginData = z.infer<typeof loginSchema>

  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      login(data.accessToken, data.user)
      navigate('/dashboard')
    },
    onError: () => toast.error(t('auth.login.error')),
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="w-full space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">{t('auth.login.emailLabel')}</Label>
        <Input id="login-email" type="email" placeholder="tu@email.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="login-password">{t('auth.login.passwordLabel')}</Label>
        <Input id="login-password" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.login.switchPrompt')}{' '}
        <button type="button" onClick={onSwitch} className="text-primary font-medium hover:underline">
          {t('auth.login.switchLink')}
        </button>
      </p>
    </form>
  )
}

// ─── Register Form ───────────────────────────────────────────────────────────

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const registerSchema = z.object({
    email: z.email(t('auth.validation.invalidEmail')),
    username: z
      .string()
      .min(3, t('auth.validation.usernameTooShort'))
      .max(30, t('auth.validation.usernameTooLong')),
    password: z.string().min(6, t('auth.validation.passwordTooShort')),
  })
  type RegisterData = z.infer<typeof registerSchema>

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  })

  const mutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      login(data.accessToken, data.user)
      navigate('/dashboard')
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string | string[] } } }
      const raw = err?.response?.data?.message ?? t('common.error')
      const msg = Array.isArray(raw) ? (raw[0] ?? t('common.error')) : raw
      toast.error(msg)
    },
  })

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="w-full space-y-3.5">
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">{t('auth.register.emailLabel')}</Label>
        <Input id="reg-email" type="email" placeholder="tu@email.com" {...register('email')} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-username">{t('auth.register.usernameLabel')}</Label>
        <Input id="reg-username" placeholder="mi_usuario" {...register('username')} />
        {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-password">{t('auth.register.passwordLabel')}</Label>
        <Input id="reg-password" type="password" placeholder="••••••••" {...register('password')} />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={mutation.isPending}>
        {mutation.isPending ? t('auth.register.submitting') : t('auth.register.submit')}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.register.switchPrompt')}{' '}
        <button type="button" onClick={onSwitch} className="text-primary font-medium hover:underline">
          {t('auth.register.switchLink')}
        </button>
      </p>
    </form>
  )
}

// ─── Auth Page ───────────────────────────────────────────────────────────────
//
// Decorative panel architecture:
//   - Teal panel (w-1/2, overflow:hidden): slides between left (register) and right (login)
//   - Both text blocks are children of the panel with overflow:hidden
//   - Each text counteracts the panel's translateX to appear fixed relative to the parent
//     · Register text: translateX(-panelX%)     → visible on left, exits left when going right
//     · Login text:    translateX((100-panelX)%) → exits right when on left, enters when going right
//   - The panel's overflow:hidden geometrically clips anything outside its bounds

export function AuthPage({ defaultMode = 'login' }: { defaultMode?: 'login' | 'register' }) {
  const { t } = useTranslation()
  // 0 = panel on left half (register mode), 100 = panel on right half (login mode)
  const [panelX, setPanelX] = useState(defaultMode === 'register' ? 0 : 100)
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode)
  const [animating, setAnimating] = useState(false)

  const switchTo = (newMode: 'login' | 'register') => {
    if (animating) return
    setAnimating(true)
    setMode(newMode)
    setPanelX(newMode === 'register' ? 0 : 100)
    window.history.replaceState(null, '', newMode === 'login' ? '/login' : '/register')
    setTimeout(() => setAnimating(false), 420)
  }

  const x = panelX
  const transition = 'transform 400ms ease-in-out'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Theme toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Mobile: single card */}
      <div className="md:hidden w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <BookOpen className="size-6 text-primary" />
          <span className="text-xl font-bold">{t('common.appName')}</span>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6">
          {mode === 'register' ? (
            <>
              <h2 className="text-xl font-semibold mb-1">{t('auth.register.title')}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t('auth.register.subtitle')}</p>
              <RegisterForm onSwitch={() => switchTo('login')} />
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-1">{t('auth.login.title')}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t('auth.login.subtitle')}</p>
              <LoginForm onSwitch={() => switchTo('register')} />
            </>
          )}
        </div>
      </div>

      {/* Desktop: split panel */}
      <div
        className="hidden md:block relative w-full max-w-3xl h-[520px] rounded-2xl overflow-hidden border border-border bg-card"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        {/* Layer 1 — Forms (background, z-0) */}
        <div className="absolute inset-0 flex">
          <div className="w-1/2 h-full flex items-center justify-center px-10 py-8">
            <div className="w-full">
              <h2 className="text-2xl font-semibold mb-1">{t('auth.login.title')}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t('auth.login.subtitle')}</p>
              <LoginForm onSwitch={() => switchTo('register')} />
            </div>
          </div>
          <div className="w-1/2 h-full flex items-center justify-center px-10 py-8">
            <div className="w-full">
              <h2 className="text-2xl font-semibold mb-1">{t('auth.register.title')}</h2>
              <p className="text-sm text-muted-foreground mb-6">{t('auth.register.subtitle')}</p>
              <RegisterForm onSwitch={() => switchTo('login')} />
            </div>
          </div>
        </div>

        {/* Layer 2 — Sliding teal panel (z-10, overflow:hidden) containing both text blocks */}
        <div
          className="absolute inset-y-0 left-0 w-1/2 z-10 bg-primary overflow-hidden"
          style={{ transform: `translateX(${x}%)`, transition }}
        >
          {/* Background decoration */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: 'radial-gradient(circle, #0F172A 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
          <div className="absolute top-0 left-0 w-full h-1.5 bg-primary-foreground/20" />
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-primary-foreground/20" />

          {/* Register text — counteracts the slide, stays fixed on the left half */}
          <div
            className="absolute inset-y-0 left-0 w-full flex flex-col items-center justify-center gap-4 p-10 text-center"
            style={{ transform: `translateX(${-x}%)`, transition }}
          >
            <div className="flex items-center justify-center size-16 rounded-2xl bg-primary-foreground/15 border border-primary-foreground/20">
              <BookOpen className="size-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground leading-snug">
                {t('auth.panel.registerTagline')}
              </h1>
              <div className="mt-2 mx-auto w-10 h-0.5 bg-primary-foreground/40 rounded-full" />
            </div>
            <p className="text-sm text-primary-foreground/80 leading-relaxed max-w-[220px]">
              {t('auth.panel.registerBody')}
            </p>
          </div>

          {/* Login text — counteracts the slide, stays fixed on the right half */}
          <div
            className="absolute inset-y-0 left-0 w-full flex flex-col items-center justify-center gap-4 p-10 text-center"
            style={{ transform: `translateX(${100 - x}%)`, transition }}
          >
            <div className="flex items-center justify-center size-16 rounded-2xl bg-primary-foreground/15 border border-primary-foreground/20">
              <BookOpen className="size-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground leading-snug">
                {t('auth.panel.loginTagline')}
              </h1>
              <div className="mt-2 mx-auto w-10 h-0.5 bg-primary-foreground/40 rounded-full" />
            </div>
            <p className="text-sm text-primary-foreground/80 leading-relaxed max-w-[220px]">
              {t('auth.panel.loginBody')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
