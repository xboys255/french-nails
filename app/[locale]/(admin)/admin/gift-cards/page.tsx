import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import AdminGiftCards from '@/components/admin/AdminGiftCards'

export default async function GiftCardsPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${locale}`)

  const { data: cards } = await supabase
    .from('gift_cards')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar role="admin" userName={profile?.full_name} />
      <AdminGiftCards initialCards={cards ?? []} />
    </div>
  )
}
