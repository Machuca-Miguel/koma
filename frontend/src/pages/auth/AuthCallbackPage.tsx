import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { User } from '@/types'

export function AuthCallbackPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const encoded = params.get('u')

    if (!token || !encoded) {
      navigate('/login', { replace: true })
      return
    }

    try {
      const user = JSON.parse(atob(encoded)) as User
      login(token, user)
      navigate('/dashboard', { replace: true })
    } catch {
      navigate('/login', { replace: true })
    }
  }, [login, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground text-sm">Iniciando sesión...</p>
    </div>
  )
}
