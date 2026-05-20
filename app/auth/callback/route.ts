import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Honour ?next= param passed through state (e.g. from /book redirect)
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

  return NextResponse.redirect(`${origin}/en/auth/login?error=oauth`)
}
