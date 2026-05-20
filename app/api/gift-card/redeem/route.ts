import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { giftCardId, amount, appointmentId } = await req.json()
  const adminSupabase = await createAdminClient()

  const { data: card } = await adminSupabase
    .from('gift_cards')
    .select('remaining_balance, is_active')
    .eq('id', giftCardId)
    .single()

  if (!card || !card.is_active) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const deduct = Math.min(amount, card.remaining_balance)
  const newBalance = card.remaining_balance - deduct

  const { error } = await adminSupabase
    .from('gift_cards')
    .update({
      remaining_balance: newBalance,
      ...(newBalance === 0 ? { is_active: false } : {}),
    })
    .eq('id', giftCardId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (appointmentId) {
    await adminSupabase
      .from('appointments')
      .update({ gift_card_id: giftCardId, gift_card_discount: deduct })
      .eq('id', appointmentId)
  }

  return NextResponse.json({ ok: true, deducted: deduct, newBalance })
}
