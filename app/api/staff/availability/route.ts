import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'staff' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { staffId, schedule } = await req.json()

  const rows = schedule.map((day: any) => ({
    staff_id: staffId,
    day_of_week: day.day,
    start_time: day.start_time + ':00',
    end_time: day.end_time + ':00',
    is_available: day.is_available,
  }))

  const { error } = await supabase
    .from('staff_availability')
    .upsert(rows, { onConflict: 'staff_id,day_of_week' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
