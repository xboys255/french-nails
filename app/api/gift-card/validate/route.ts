import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { code } = await req.json()
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: card } = await supabase
    .from('gift_cards')
    .select('id, remaining_balance, expires_at, is_active')
    .eq('code', code.toUpperCase().trim())
    .single()

  if (!card || !card.is_active) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  if (card.expires_at && card.expires_at < today) return NextResponse.json({ error: 'expired' }, { status: 400 })
  if (card.remaining_balance <= 0) return NextResponse.json({ error: 'depleted' }, { status: 400 })

  return NextResponse.json({ id: card.id, remainingBalance: card.remaining_balance })
}
