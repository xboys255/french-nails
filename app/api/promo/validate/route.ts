import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { code, orderAmount } = await req.json()
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .lte('valid_from', today)
    .single()

  if (!promo) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  if (promo.valid_until && promo.valid_until < today)
    return NextResponse.json({ error: 'expired' }, { status: 400 })
  if (promo.max_uses !== null && promo.uses_count >= promo.max_uses)
    return NextResponse.json({ error: 'exhausted' }, { status: 400 })
  if (orderAmount < promo.min_order_amount)
    return NextResponse.json({ error: 'min_order' }, { status: 400 })

  const discountAmount =
    promo.discount_type === 'percentage'
      ? Math.round((orderAmount * promo.discount_value) / 100)
      : promo.discount_value

  return NextResponse.json({ id: promo.id, discountAmount })
}
