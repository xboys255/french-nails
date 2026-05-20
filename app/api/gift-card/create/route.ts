import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { code, initialBalance, expiresAt } = await req.json()
  const adminSupabase = await createAdminClient()

  const { data: card, error } = await adminSupabase
    .from('gift_cards')
    .insert({
      code: code.toUpperCase().trim(),
      initial_balance: initialBalance,
      remaining_balance: initialBalance,
      is_active: true,
      expires_at: expiresAt ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ card })
}
