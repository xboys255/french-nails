import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import AdminDashboard from '@/components/admin/AdminDashboard'

export default async function AdminPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${locale}`)

  const today = new Date().toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const [
    { data: todayAppts },
    { data: monthAppts },
    { data: recentAppts },
    { data: staffList },
  ] = await Promise.all([
    supabase.from('appointments').select('id, total_amount, status').eq('date', today).neq('status', 'cancelled'),
    supabase.from('appointments').select('id, total_amount, status, client_id').gte('date', monthStart).neq('status', 'cancelled'),
    supabase.from('appointments').select('*, client:profiles(*), staff:staff(*, profile:profiles(*)), services:appointment_services(*, service:services(*))').order('date', { ascending: false }).order('start_time').limit(20),
    supabase.from('staff').select('*, profile:profiles(*)').eq('is_active', true),
  ])

  const todayRevenue = (todayAppts ?? []).reduce((a, b) => a + b.total_amount, 0)
  const monthRevenue = (monthAppts ?? []).reduce((a, b) => a + b.total_amount, 0)

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="admin" userName={profile?.full_name} />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <AdminDashboard
          todayAppts={todayAppts ?? []}
          monthAppts={monthAppts ?? []}
          recentAppts={recentAppts ?? []}
          staffList={staffList ?? []}
          todayRevenue={todayRevenue}
          monthRevenue={monthRevenue}
          locale={locale}
        />
      </div>
    </div>
  )
}
