import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { date, staffId, serviceIds } = await req.json()
  if (!date || !serviceIds?.length)
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Prevent duplicate entries for the same date
  const { data: existing } = await supabase
    .from('waitlist')
    .select('id')
    .eq('client_id', user.id)
    .eq('preferred_date', date)
    .maybeSingle()

  if (existing) return NextResponse.json({ success: true, alreadyJoined: true })

  const { error } = await supabase.from('waitlist').insert({
    client_id: user.id,
    staff_id: staffId || null,
    service_id: serviceIds[0],          // schema supports one service per waitlist entry
    preferred_date: date,
    preferred_time_start: '09:00:00',
    preferred_time_end: '19:00:00',
    status: 'waiting',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
