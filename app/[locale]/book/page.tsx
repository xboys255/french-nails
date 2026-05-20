import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import BookingWizard from '@/components/booking/BookingWizard'
import PhoneGate from '@/components/booking/PhoneGate'
import Navbar from '@/components/shared/Navbar'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'

export default async function BookPage() {
  const locale = await getLocale()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Must be signed in to book
  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/book`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: services } = await supabase
    .from('services')
    .select('*, category:service_categories(*)')
    .eq('is_active', true)
    .order('category_id')

  // Use service client so the profiles join bypasses RLS
  // (the anon role cannot read other users' profiles)
  const admin = createServiceClient()
  const { data: staffList } = await admin
    .from('staff')
    .select('*, profile:profiles(*), availability:staff_availability(*)')
    .eq('is_active', true)

  // Guard: profile should always exist for authenticated users (created by DB trigger),
  // but redirect defensively if the trigger hasn't run yet.
  if (!profile) {
    redirect(`/${locale}/auth/login`)
  }

  const needsPhone = !profile.phone

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role={profile.role ?? null} userName={profile.full_name ?? null} />

      {needsPhone ? (
        // Collect phone number before showing the booking wizard
        <PhoneGate
          profile={profile}
          services={services ?? []}
          staffList={staffList ?? []}
          locale={locale}
        />
      ) : (
        <BookingWizard
          services={services ?? []}
          staffList={staffList ?? []}
          profile={profile}
          locale={locale}
        />
      )}
    </div>
  )
}
