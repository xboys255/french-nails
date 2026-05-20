import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import AdminClients from '@/components/admin/AdminClients'

export default async function AdminClientsPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${locale}`)

  const { data: clients } = await supabase
    .from('profiles')
    .select('*, loyalty:loyalty_accounts(points, total_earned)')
    .eq('role', 'client')
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="admin" userName={profile?.full_name} />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <AdminClients clients={clients ?? []} locale={locale} />
      </div>
    </div>
  )
}
