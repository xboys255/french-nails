import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always run intl middleware for locale routing
  let response = intlMiddleware(request)

  // Auth-protected paths
  const isProtected =
    pathname.includes('/client') ||
    pathname.includes('/staff') ||
    pathname.includes('/admin')

  if (!isProtected) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const locale = pathname.split('/')[1] ?? 'en'
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, request.url))
  }

  return response
}

export const config = {
  // Exclude /auth/* so the OAuth callback route is never locale-rewritten
  matcher: ['/((?!api|auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
