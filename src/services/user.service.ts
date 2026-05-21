/**
 * Usuários: registro, perfil e operações ligadas à conta.
 * Rotas de auth delegam regras de negócio aqui.
 */

import { createServerClient } from '@supabase/ssr'
import { z } from 'zod'
import { cookieConfig } from '@/lib/supabase/config'
import { LoggerService } from './logger.service'

export const registerUserSchema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .min(1, 'Email é obrigatório')
    .max(255, 'Email muito longo'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .max(128, 'Senha muito longa')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Senha deve conter ao menos uma letra minúscula, maiúscula e um número'
    ),
  full_name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo')
    .optional(),
})

export type RegisterUserInput = z.infer<typeof registerUserSchema>

export interface UserProfile {
  id: string
  email?: string
  full_name?: string | null
  [key: string]: unknown
}

export class UserService {
  createAuthClient(cookieStore: Awaited<ReturnType<typeof import('next/headers').cookies>>) {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options, ...cookieConfig })
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          },
        },
      }
    )
  }

  validateRegisterInput(body: unknown): { ok: true; data: RegisterUserInput } | { ok: false; errors: string[] } {
    const result = registerUserSchema.safeParse(body)
    if (!result.success) {
      return {
        ok: false,
        errors: result.error.issues.map((i) => i.message),
      }
    }
    return { ok: true, data: result.data }
  }

  mapSupabaseAuthError(message: string): string {
    const lower = message.toLowerCase()
    if (lower.includes('already registered') || lower.includes('already exists')) {
      return 'Este email já está cadastrado'
    }
    if (lower.includes('password')) {
      return 'Senha não atende aos requisitos de segurança'
    }
    if (lower.includes('email')) {
      return 'Email inválido'
    }
    return 'Erro ao criar conta. Tente novamente.'
  }

  async register(
    supabase: ReturnType<UserService['createAuthClient']>,
    input: RegisterUserInput
  ) {
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.full_name ?? input.email.split('@')[0],
        },
      },
    })

    if (error) {
      LoggerService.warn('Falha no registro', 'UserService', { email: input.email })
      throw new UserServiceError(this.mapSupabaseAuthError(error.message), 'REGISTER_FAILED', 400)
    }

    return data
  }

  async getProfile(
    supabase: ReturnType<UserService['createAuthClient']>,
    userId: string
  ): Promise<UserProfile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) {
      LoggerService.warn('Perfil não encontrado', 'UserService', { userId })
      return null
    }
    return data as UserProfile
  }

  async getAuthenticatedUser(supabase: ReturnType<UserService['createAuthClient']>) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) {
      throw new UserServiceError('Usuário não autenticado', 'USER_NOT_AUTHENTICATED', 401)
    }
    return user
  }
}

export class UserServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus = 400
  ) {
    super(message)
    this.name = 'UserServiceError'
  }
}

export const userService = new UserService()
