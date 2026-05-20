import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendReminderSMS, sendReviewRequestSMS } from '@/lib/twilio'
import { sendBookingReminder } from '@/lib/resend'
import { formatDate, formatTime } from '@/lib/utils'

function isAuthorized(req: NextRequest) {
  // Vercel Cron sends this header automatically on Pro plans
  const cronHeader = req.headers.get('x-vercel-cron')
  // Also allow manual trigger with secret for local testing
  const secret = req.headers.get('x-cron-secret')
  return cronHeader === '1' || secret === process.env.CRON_SECRET
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') ?? 'reminder'
  const supabase = await createAdminClient()

  if (type === 'reminder') return sendAppointmentReminders(supabase)
  if (type === 'review') return sendReviewRequests(supabase)

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}

async function sendAppointmentReminders(supabase: Awaited<ReturnType<typeof createAdminClient>>) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*, client:profiles(*), staff:staff(*, profile:profiles(*))')
    .eq('date', tomorrowStr)
    .in('status', ['confirmed', 'pending'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!appointments?.length) return NextResponse.json({ sent: 0, type: 'reminder' })

  let sent = 0
  await Promise.allSettled(
    appointments.map(async (appt) => {
      const client = appt.client
      const dateLabel = formatDate(appt.date)
      const timeLabel = formatTime(appt.start_time)
      const staffName = appt.staff?.profile?.full_name ?? 'Your nail tech'

      await Promise.allSettled([
        client?.phone ? sendReminderSMS({ to: client.phone, clientName: client.full_name, date: dateLabel, time: timeLabel }) : Promise.resolve(),
        client?.email ? sendBookingReminder({ to: client.email, clientName: client.full_name, date: dateLabel, time: timeLabel, staffName }) : Promise.resolve(),
      ])
      sent++
    })
  )

  return NextResponse.json({ sent, type: 'reminder' })
}

async function sendReviewRequests(supabase: Awaited<ReturnType<typeof createAdminClient>>) {
  const today = new Date().toISOString().split('T')[0]

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*, client:profiles(*)')
    .eq('date', today)
    .eq('status', 'completed')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!appointments?.length) return NextResponse.json({ sent: 0, type: 'review' })

  let sent = 0
  await Promise.allSettled(
    appointments.map(async (appt) => {
      if (!appt.client?.phone) return
      await sendReviewRequestSMS({ to: appt.client.phone, clientName: appt.client.full_name })
      sent++
    })
  )

  return NextResponse.json({ sent, type: 'review' })
}
