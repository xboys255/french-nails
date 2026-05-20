import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import ClientAppointments from '@/components/client/ClientAppointments'

export default async function AppointmentsPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*, staff:staff(*, profile:profiles(*)), services:appointment_services(*, service:services(*))')
    .eq('client_id', user.id)
    .order('date', { ascending: false })

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role={profile?.role ?? 'client'} userName={profile?.full_name} />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <ClientAppointments appointments={appointments ?? []} locale={locale} />
      </div>
    </div>
  )
}
