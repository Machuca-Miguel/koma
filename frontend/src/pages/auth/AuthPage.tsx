import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { BookOpen } from 'lucide-react'
import { authApi, GOOGLE_AUTH_URL } from '@/api/auth'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

// ─── Google Icon ─────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

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

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => { window.location.href = GOOGLE_AUTH_URL }}
      >
        <GoogleIcon />
        {t('auth.googleButton')}
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

      <div className="relative my-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 text-muted-foreground">{t('auth.orContinueWith')}</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        onClick={() => { window.location.href = GOOGLE_AUTH_URL }}
      >
        <GoogleIcon />
        {t('auth.googleButton')}
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
