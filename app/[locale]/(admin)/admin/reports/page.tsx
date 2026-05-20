import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import AdminReports from '@/components/admin/AdminReports'

export default async function ReportsPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${locale}`)

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString().split('T')[0]

  const [
    { data: appointments },
    { data: staffStats },
    { data: allClients },
  ] = await Promise.all([
    supabase.from('appointments')
      .select('id, date, total_amount, status, client_id, staff_id, services:appointment_services(service:services(name_en))')
      .gte('date', thirtyDaysAgo)
      .neq('status', 'cancelled'),
    supabase.from('appointments')
      .select('staff_id, total_amount, staff:staff(profile:profiles(full_name))')
      .gte('date', thirtyDaysAgo)
      .neq('status', 'cancelled'),
    supabase.from('profiles').select('id, created_at').eq('role', 'client'),
  ])

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="admin" userName={profile?.full_name} />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <AdminReports
          appointments={appointments ?? []}
          staffStats={staffStats ?? []}
          allClients={allClients ?? []}
          locale={locale}
        />
      </div>
    </div>
  )
}
