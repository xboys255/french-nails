import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import AdminCalendar from '@/components/admin/AdminCalendar'

interface Props {
  searchParams: Promise<{ date?: string }>
}

export default async function CalendarPage({ searchParams }: Props) {
  const locale = await getLocale()
  const { date: dateParam } = await searchParams
  const selectedDate = dateParam ?? new Date().toISOString().split('T')[0]

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${locale}`)

  const [{ data: appointments }, { data: staffList }, { data: services }] = await Promise.all([
    supabase
      .from('appointments')
      .select('*, client:profiles(*), staff:staff(*, profile:profiles(*)), services:appointment_services(*, service:services(*, category:service_categories(*)))')
      .eq('date', selectedDate)
      .neq('status', 'cancelled')
      .order('start_time'),
    supabase
      .from('staff')
      .select('*, profile:profiles(*), availability:staff_availability(*)')
      .eq('is_active', true),
    supabase
      .from('services')
      .select('*, category:service_categories(*)')
      .eq('is_active', true)
      .order('category_id'),
  ])

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      <Navbar role="admin" userName={profile?.full_name} />
      <AdminCalendar
        appointments={appointments ?? []}
        staffList={staffList ?? []}
        services={services ?? []}
        selectedDate={selectedDate}
        locale={locale}
      />
    </div>
  )
}
