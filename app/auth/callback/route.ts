import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl

  // Supabase sends ?error + ?error_description when OAuth fails
  // (e.g. provider not enabled, redirect URL not whitelisted)
  const oauthError = searchParams.get('error')
  const oauthErrorDesc = searchParams.get('error_description')
  if (oauthError) {
    const msg = encodeURIComponent(oauthErrorDesc ?? oauthError)
    return NextResponse.redirect(`${origin}/en/auth/login?error=oauth&msg=${msg}`)
  }

  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      const msg = encodeURIComponent(error.message)
      return NextResponse.redirect(`${origin}/en/auth/login?error=oauth&msg=${msg}`)
    }

    if (data.user) {
      // Honour ?next= param (e.g. redirected from /book)
      const next = searchParams.get('next')
      if (next && next.startsWith('/')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // Redirect based on role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      const role = profile?.role ?? 'client'
      const locale = 'en'
      if (role === 'admin') return NextResponse.redirect(`${origin}/${locale}/admin`)
      if (role === 'staff') return NextResponse.redirect(`${origin}/${locale}/staff`)
      return NextResponse.redirect(`${origin}/${locale}/client/appointments`)
    }
  }

  return NextResponse.redirect(`${origin}/en/auth/login?error=oauth&msg=No+authorization+code+received`)
}
