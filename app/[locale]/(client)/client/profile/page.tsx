import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import ClientProfile from '@/components/client/ClientProfile'

export default async function ProfilePage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="client" userName={profile?.full_name} />
      <div className="mx-auto max-w-md px-4 py-10">
        <ClientProfile profile={profile} locale={locale} />
      </div>
    </div>
  )
}
