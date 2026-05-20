import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import AdminServices from '@/components/admin/AdminServices'

export default async function AdminServicesPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect(`/${locale}`)

  const { data: services } = await supabase
    .from('services')
    .select('*, category:service_categories(*)')
    .order('category_id')

  const { data: categories } = await supabase
    .from('service_categories')
    .select('*')
    .order('sort_order')

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="admin" userName={profile?.full_name} />
      <div className="mx-auto max-w-5xl px-4 py-10">
        <AdminServices services={services ?? []} categories={categories ?? []} locale={locale} />
      </div>
    </div>
  )
}
