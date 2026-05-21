import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { ErrorService, ErrorType } from '@/services/error.service'

export async function getGates2bAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      throw ErrorService.createError(
        ErrorType.AUTHENTICATION,
        'Usuário não autenticado',
        'USER_NOT_AUTHENTICATED'
      )
    }

    return user
  } catch (error) {
    throw ErrorService.fromNativeError(error)
  }
}

export function gates2bRouteErrorResponse(appError: ReturnType<typeof ErrorService.fromNativeError>) {
  let statusCode = 500
  if (appError.type === 'AUTHENTICATION') statusCode = 401
  else if (appError.type === 'AUTHORIZATION') statusCode = 403
  else if (appError.type === 'VALIDATION') statusCode = 400
  else if (appError.type === 'NOT_FOUND') statusCode = 404

  return { statusCode, body: { success: false, message: appError.message, error: appError.code } }
}
