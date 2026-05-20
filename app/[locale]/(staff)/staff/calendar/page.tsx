import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import StaffCalendar from '@/components/staff/StaffCalendar'

export default async function StaffCalendarPage() {
  const locale = await getLocale()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'staff' && profile?.role !== 'admin') redirect(`/${locale}`)

  const { data: staffRecord } = await supabase
    .from('staff')
    .select('id')
    .eq('profile_id', user.id)
    .single()

  // Load a 60-day window: 7 days back + 53 days forward
  const from = new Date()
  from.setDate(from.getDate() - 7)
  const to = new Date()
  to.setDate(to.getDate() + 53)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, client:profiles(full_name, phone), services:appointment_services(service:services(name_en))')
    .eq('staff_id', staffRecord?.id)
    .gte('date', from.toISOString().split('T')[0])
    .lte('date', to.toISOString().split('T')[0])
    .neq('status', 'cancelled')
    .order('date')
    .order('start_time')

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="staff" userName={profile?.full_name} />
      <StaffCalendar
        appointments={appointments ?? []}
        staffId={staffRecord?.id ?? ''}
      />
    </div>
  )
}
