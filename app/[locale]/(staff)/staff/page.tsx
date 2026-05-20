import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import StaffDashboard from '@/components/staff/StaffDashboard'

export default async function StaffPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'staff' && profile?.role !== 'admin') redirect(`/${locale}`)

  const { data: staffRecord } = await supabase
    .from('staff')
    .select('*, availability:staff_availability(*)')
    .eq('profile_id', user.id)
    .single()

  const today = new Date().toISOString().split('T')[0]
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const weekStart = startOfWeek.toISOString().split('T')[0]
  const monthStart = today.slice(0, 7) + '-01'

  const [
    { data: todayAppts },
    { data: upcomingAppts },
    { data: monthAppts },
    { data: services },
    { data: allStaff },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, client:profiles(*), services:appointment_services(*, service:services(*))')
      .eq('staff_id', staffRecord?.id)
      .eq('date', today)
      .in('status', ['confirmed', 'pending', 'in_progress'])
      .order('start_time'),
    supabase
      .from('appointments')
      .select('*, client:profiles(*), services:appointment_services(*, service:services(*))')
      .eq('staff_id', staffRecord?.id)
      .gt('date', today)
      .in('status', ['confirmed', 'pending'])
      .order('date')
      .order('start_time')
      .limit(20),
    supabase
      .from('appointments')
      .select('id, date, total_amount, status')
      .eq('staff_id', staffRecord?.id)
      .gte('date', monthStart)
      .neq('status', 'cancelled'),
    supabase
      .from('services')
      .select('*, category:service_categories(*)')
      .eq('is_active', true)
      .order('category_id'),
    supabase
      .from('staff')
      .select('*, profile:profiles(full_name)')
      .eq('is_active', true),
  ])

  const weekAppts = (monthAppts ?? []).filter(a => a.date >= weekStart)
  const earnings = {
    weekRevenue: weekAppts.reduce((s, a) => s + (a.total_amount ?? 0), 0),
    monthRevenue: (monthAppts ?? []).reduce((s, a) => s + (a.total_amount ?? 0), 0),
    weekBookings: weekAppts.length,
    monthBookings: (monthAppts ?? []).length,
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="staff" userName={profile?.full_name} />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <StaffDashboard
          staff={staffRecord}
          profile={profile}
          todayAppts={todayAppts ?? []}
          upcomingAppts={upcomingAppts ?? []}
          earnings={earnings}
          services={services ?? []}
          allStaff={allStaff ?? []}
          locale={locale}
        />
      </div>
    </div>
  )
}
