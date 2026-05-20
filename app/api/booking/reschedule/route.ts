import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { addMinutes, CANCELLATION_HOURS, formatDate, formatTime } from '@/lib/utils'
import { sendBookingConfirmationSMS } from '@/lib/twilio'
import { sendBookingConfirmation } from '@/lib/resend'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { appointmentId, newDate, newStartTime } = await req.json()

  const { data: appt } = await supabase
    .from('appointments')
    .select('*, services:appointment_services(service:services(duration_minutes))')
    .eq('id', appointmentId)
    .single()

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (appt.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['pending', 'confirmed'].includes(appt.status))
    return NextResponse.json({ error: 'Cannot reschedule' }, { status: 400 })

  // Enforce cancellation window on current appointment
  const currentDt = new Date(`${appt.date}T${appt.start_time}`)
  const hoursUntil = (currentDt.getTime() - Date.now()) / 3600000
  if (hoursUntil < CANCELLATION_HOURS)
    return NextResponse.json({ error: `Cannot reschedule within ${CANCELLATION_HOURS} hours of appointment` }, { status: 400 })

  // Check new slot availability
  const { data: conflicts } = await supabase
    .from('appointments')
    .select('id')
    .eq('staff_id', appt.staff_id)
    .eq('date', newDate)
    .neq('status', 'cancelled')
    .neq('id', appointmentId)
    .lte('start_time', newStartTime)
    .gt('end_time', newStartTime)

  if (conflicts && conflicts.length > 0)
    return NextResponse.json({ error: 'That slot is no longer available' }, { status: 409 })

  const totalDuration = appt.services?.reduce((a: number, s: any) => a + (s.service?.duration_minutes ?? 0), 0) ?? 60
  const newEndTime = addMinutes(newStartTime, totalDuration)

  await adminSupabase
    .from('appointments')
    .update({ date: newDate, start_time: newStartTime, end_time: newEndTime, status: 'confirmed' })
    .eq('id', appointmentId)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const dateLabel = formatDate(newDate)
  const timeLabel = formatTime(newStartTime)

  const serviceNames = appt.services?.map((s: any) => s.service?.name_en ?? '').filter(Boolean) ?? []

  if (profile?.phone)
    sendBookingConfirmationSMS({ to: profile.phone, clientName: profile.full_name, date: dateLabel, time: timeLabel }).catch(() => {})
  if (profile?.email)
    sendBookingConfirmation({ to: profile.email, clientName: profile.full_name, date: dateLabel, time: timeLabel, services: serviceNames, staffName: 'Your nail tech', appointmentId }).catch(() => {})

  return NextResponse.json({ success: true, newDate, newStartTime, newEndTime })
}
