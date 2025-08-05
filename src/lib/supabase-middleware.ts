// src/lib/supabase-middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export function createMiddlewareSupabaseClient(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name)
          console.log(`🍪 Middleware: Obtendo cookie ${name}:`, cookie?.value ? 'presente' : 'ausente')
          return cookie?.value
        },
        set(name: string, value: string, options: any) {
          console.log(`🍪 Middleware: Definindo cookie ${name}`)
          const cookieOptions = {
            ...options,
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/'
          }
          
          request.cookies.set({
            name,
            value,
            ...cookieOptions,
          })
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          response.cookies.set({
            name,
            value,
            ...cookieOptions,
          })
        },
        remove(name: string, options: any) {
          console.log(`🍪 Middleware: Removendo cookie ${name}`)
          const cookieOptions = {
            ...options,
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax' as const,
            path: '/'
          }
          
          request.cookies.set({
            name,
            value: '',
            ...cookieOptions,
          })
          
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          
          response.cookies.set({
            name,
            value: '',
            ...cookieOptions,
          })
        },
      },
    }
  )

  return { supabase, response }
}

export async function getUser(request: NextRequest) {
  try {
    const { supabase } = createMiddlewareSupabaseClient(request)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('🔐 Middleware: Erro ao obter usuário:', error.message)
      return null
    }
    
    return user
  } catch (error) {
    console.log('🔐 Middleware: Erro na verificação de usuário:', error)
    return null
  }
}

export async function getUserWithResponse(request: NextRequest) {
  try {
    const { supabase, response } = createMiddlewareSupabaseClient(request)
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.log('🔐 Middleware: Erro ao obter usuário:', error.message)
      return { user: null, response }
    }
    
    return { user, response }
  } catch (error) {
    console.log('🔐 Middleware: Erro na verificação de usuário:', error)
    return { user: null, response: NextResponse.next() }
  }
}