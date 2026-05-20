import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const phone = req.nextUrl.searchParams.get('phone') ?? ''
  const normalized = phone.replace(/\D/g, '')

  const { data: clients } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email')
    .eq('role', 'client')
    .or(`phone.ilike.%${normalized}%,phone.ilike.%${phone}%`)
    .limit(5)

  const client = clients?.[0] ?? null
  return NextResponse.json({ client })
}
