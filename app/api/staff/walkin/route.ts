import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addMinutes } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'staff' && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { clientId, serviceIds, staffId, date, startTime, notes } = await req.json()

  const { data: services } = await supabase
    .from('services')
    .select('id, duration_minutes, price')
    .in('id', serviceIds)

  if (!services?.length) return NextResponse.json({ error: 'No services found' }, { status: 400 })

  const totalDuration = services.reduce((s, svc) => s + svc.duration_minutes, 0)
  const endTime = addMinutes(startTime, totalDuration)
  const total = services.reduce((s, svc) => s + svc.price, 0)

  const { data: appointment, error } = await supabase
    .from('appointments')
    .insert({
      client_id: clientId,
      staff_id: staffId,
      date,
      start_time: startTime,
      end_time: endTime,
      status: 'confirmed',
      payment_status: 'unpaid',
      total_amount: total,
      deposit_amount: 0,
      discount_amount: 0,
      notes: notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('appointment_services').insert(
    services.map(s => ({ appointment_id: appointment.id, service_id: s.id, price: s.price }))
  )

  return NextResponse.json({ appointmentId: appointment.id })
}
