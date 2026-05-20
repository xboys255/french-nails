'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Profile } from '@/types'

interface Props {
  profile: Profile | null
  locale: string
}

export default function ClientProfile({ profile, locale }: Props) {
  const t = useTranslations('profile')
  const supabase = createClient()

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setLoading(true)
    await supabase
      .from('profiles')
      .update({ full_name: fullName, email })
      .eq('id', profile!.id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">{t('title')}</h1>
      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">{t('fullName')}</label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">{t('phone')}</label>
            <Input value={profile?.phone ?? ''} disabled className="bg-zinc-50 text-zinc-400" />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1">{t('email')}</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
          </div>
          {saved && <p className="text-green-600 text-sm">{t('saved')}</p>}

          <Button className="w-full" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : t('save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
