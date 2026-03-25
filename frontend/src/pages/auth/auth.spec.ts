import { z } from 'zod'

// Replicate schemas from AuthPage (they're private, so we redefine them here)
const loginSchema = z.object({
  email: z.email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
})

const registerSchema = z.object({
  email: z.email('Email inválido'),
  username: z.string().min(3, 'Mínimo 3 caracteres').max(30, 'Máximo 30 caracteres'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'secret' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Email inválido')
    }
  })

  it('rejects empty password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('password')
    }
  })

  it('rejects missing fields', () => {
    const result = loginSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('accepts valid registration data', () => {
    const result = registerSchema.safeParse({
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = registerSchema.safeParse({
      email: 'bad-email',
      username: 'user',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const emailIssue = result.error.issues.find((i) => i.path.includes('email'))
      expect(emailIssue?.message).toBe('Email inválido')
    }
  })

  it('rejects username shorter than 3 characters', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      username: 'ab',
      password: 'password123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('username'))
      expect(issue?.message).toBe('Mínimo 3 caracteres')
    }
  })

  it('rejects username longer than 30 characters', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      username: 'a'.repeat(31),
      password: 'password123',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('username'))
      expect(issue?.message).toBe('Máximo 30 caracteres')
    }
  })

  it('accepts username of exactly 3 characters', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      username: 'abc',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts username of exactly 30 characters', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      username: 'a'.repeat(30),
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('rejects password shorter than 6 characters', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      username: 'user123',
      password: '12345',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('password'))
      expect(issue?.message).toBe('Mínimo 6 caracteres')
    }
  })

  it('accepts password of exactly 6 characters', () => {
    const result = registerSchema.safeParse({
      email: 'a@b.com',
      username: 'user123',
      password: '123456',
    })
    expect(result.success).toBe(true)
  })
})
