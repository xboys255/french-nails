import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { POINTS_PER_DOLLAR } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as any
    const { appointmentId, clientId } = pi.metadata

    if (!appointmentId) return NextResponse.json({ received: true })

    const adminSupabase = await createAdminClient()

    // Update appointment
    await adminSupabase
      .from('appointments')
      .update({ status: 'confirmed', payment_status: 'deposit_paid' })
      .eq('id', appointmentId)

    // Award loyalty points (based on total, not deposit)
    const { data: appt } = await adminSupabase
      .from('appointments')
      .select('total_amount')
      .eq('id', appointmentId)
      .single()

    if (appt && clientId) {
      const pointsEarned = Math.floor((appt.total_amount / 100) * POINTS_PER_DOLLAR)

      await adminSupabase.rpc('add_loyalty_points', {
        p_client_id: clientId,
        p_points: pointsEarned,
        p_appointment_id: appointmentId,
        p_description: `Earned from appointment`,
      })
    }
  }

  return NextResponse.json({ received: true })
}
