import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { POINTS_PER_DOLLAR } from '@/lib/utils'

export async function POST(req: NextRequest) {
  // Internal-only endpoint — require shared secret
  const secret = req.headers.get('x-internal-secret')
  if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const adminSupabase = await createAdminClient()
  const { appointmentId, clientId, amountCents } = await req.json()
  if (!clientId || !amountCents) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const points = Math.floor((amountCents / 100) * POINTS_PER_DOLLAR)
  if (points <= 0) return NextResponse.json({ success: true, points: 0 })

  // Upsert loyalty account
  await adminSupabase.from('loyalty_accounts').upsert(
    { client_id: clientId, points: 0, total_earned: 0, total_redeemed: 0 },
    { onConflict: 'client_id', ignoreDuplicates: true }
  )

  // Record transaction
  await adminSupabase.from('loyalty_transactions').insert({
    client_id: clientId,
    appointment_id: appointmentId ?? null,
    type: 'earned',
    points,
    description: 'Earned for appointment',
  })

  // Increment account balance
  await adminSupabase.rpc('increment_loyalty_points', { p_client_id: clientId, p_points: points, p_earned: points })

  return NextResponse.json({ success: true, points })
}
