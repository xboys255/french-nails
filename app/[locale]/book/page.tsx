import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import BookingWizard from '@/components/booking/BookingWizard'
import Navbar from '@/components/shared/Navbar'
import { getLocale } from 'next-intl/server'

export default async function BookPage() {
  const locale = await getLocale()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  const { data: services } = await supabase
    .from('services')
    .select('*, category:service_categories(*)')
    .eq('is_active', true)
    .order('category_id')

  // Use service client so the profiles join works for anonymous visitors
  // (the anon role cannot read other users' profiles due to RLS)
  const admin = createServiceClient()
  const { data: staffList } = await admin
    .from('staff')
    .select('*, profile:profiles(*), availability:staff_availability(*)')
    .eq('is_active', true)

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role={profile?.role ?? null} userName={profile?.full_name ?? null} />
      <BookingWizard
        services={services ?? []}
        staffList={staffList ?? []}
        profile={profile}
        locale={locale}
      />
    </div>
  )
}
