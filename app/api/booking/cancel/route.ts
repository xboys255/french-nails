import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { refundPayment } from '@/lib/stripe'
import { sendCancellationEmail } from '@/lib/resend'
import { sendCancellationSMS, sendWaitlistNotificationSMS } from '@/lib/twilio'
import { formatDate, formatTime, CANCELLATION_HOURS } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { appointmentId } = await req.json()

  const { data: appt } = await supabase
    .from('appointments')
    .select('*, client:profiles(*)')
    .eq('id', appointmentId)
    .single()

  if (!appt) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (appt.client_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (!['pending', 'confirmed'].includes(appt.status))
    return NextResponse.json({ error: 'Cannot cancel' }, { status: 400 })

  // Check cancellation window
  const appointmentDt = new Date(`${appt.date}T${appt.start_time}`)
  const hoursUntil = (appointmentDt.getTime() - Date.now()) / 3600000
  const withinWindow = hoursUntil < CANCELLATION_HOURS
  const shouldRefund = !withinWindow && appt.payment_status === 'deposit_paid' && appt.stripe_payment_intent_id

  // Refund if eligible
  if (shouldRefund) {
    await refundPayment(appt.stripe_payment_intent_id)
  }

  // Update appointment
  await adminSupabase
    .from('appointments')
    .update({
      status: 'cancelled',
      payment_status: shouldRefund ? 'refunded' : appt.payment_status,
    })
    .eq('id', appointmentId)

  // Notify client
  const client = appt.client as any
  const dateLabel = formatDate(appt.date)
  const timeLabel = formatTime(appt.start_time)

  if (client?.phone) {
    sendCancellationSMS({ to: client.phone, clientName: client.full_name }).catch(() => {})
  }
  if (client?.email) {
    sendCancellationEmail({
      to: client.email,
      clientName: client.full_name,
      date: dateLabel,
      time: timeLabel,
      refunded: !!shouldRefund,
    }).catch(() => {})
  }

  // Notify first waitlist member that a slot opened up
  const { data: waitlistEntry } = await adminSupabase
    .from('waitlist')
    .select('*, client:profiles!waitlist_client_id_fkey(full_name, phone, email)')
    .eq('preferred_date', appt.date)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (waitlistEntry) {
    const wc = waitlistEntry.client as any
    if (wc?.phone) {
      sendWaitlistNotificationSMS({
        to: wc.phone,
        clientName: wc.full_name ?? 'there',
        date: dateLabel,
        time: timeLabel,
      }).catch(() => {})
    }
    // Mark as notified instead of deleting — preserves history
    await adminSupabase.from('waitlist').update({ status: 'notified' }).eq('id', waitlistEntry.id)
  }

  return NextResponse.json({ success: true, refunded: !!shouldRefund })
}
