import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import AdminStaff from '@/components/admin/AdminStaff'

export default async function AdminStaffPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${locale}`)

  const { data: staffList } = await supabase
    .from('staff')
    .select('*, profile:profiles(*), availability:staff_availability(*)')
    .order('created_at')

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="admin" userName={profile?.full_name} />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <AdminStaff staffList={staffList ?? []} locale={locale} />
      </div>
    </div>
  )
}
