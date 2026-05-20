import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import AdminAppointments from '@/components/admin/AdminAppointments'

export default async function AdminAppointmentsPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${locale}`)

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, client:profiles(*), staff:staff(*, profile:profiles(*)), services:appointment_services(*, service:services(*))')
    .order('date', { ascending: false })
    .order('start_time')
    .limit(100)

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="admin" userName={profile?.full_name} />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <AdminAppointments appointments={appointments ?? []} locale={locale} />
      </div>
    </div>
  )
}
