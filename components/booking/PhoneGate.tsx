'use client'

import { useState } from 'react'
import { Phone, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/shared/Logo'
import type { Profile, Service, Staff } from '@/types'
import BookingWizard from './BookingWizard'

interface Props {
  profile: Profile
  services: Service[]
  staffList: Staff[]
  locale: string
}

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return raw.startsWith('+') ? raw : `+${digits}`
}

export default function PhoneGate({ profile, services, staffList, locale }: Props) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [savedProfile, setSavedProfile] = useState<Profile | null>(null)

  // If profile already has a phone or user just saved one → show booking wizard
  if (profile.phone || savedProfile) {
    return (
      <BookingWizard
        services={services}
        staffList={staffList}
        profile={savedProfile ?? profile}
        locale={locale}
      />
    )
  }

  async function savePhone() {
    const e164 = toE164(phone)
    if (e164.length < 10) {
      setError('Please enter a valid phone number.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ phone: e164 })
      .eq('id', profile.id)

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSavedProfile({ ...profile, phone: e164 })
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">

        {/* Logo mark */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <LogoMark className="h-9 w-8 text-zinc-900" color="#17171c" />
          <span
            className="text-base font-light tracking-[0.22em] uppercase text-zinc-900"
            style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
          >
            French Nails
          </span>
        </div>

        <div className="bg-white rounded-[22px] border border-zinc-100 shadow-sm p-8">
          {/* Icon */}
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-6 mx-auto">
            <Phone className="h-5 w-5 text-zinc-600" />
          </div>

          {/* Heading */}
          <h2
            className="text-2xl font-light text-center text-zinc-900 tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
          >
            One last thing
          </h2>
          <p className="text-xs text-center text-zinc-400 tracking-wide leading-relaxed mb-7">
            We need your phone number to send appointment<br />confirmations and reminders.
          </p>

          {/* Input */}
          <div className="flex border border-zinc-200 rounded-xl overflow-hidden focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-colors mb-3">
            <div className="flex items-center gap-1.5 px-3 bg-zinc-50 border-r border-zinc-200 text-xs font-medium text-zinc-500 select-none flex-shrink-0">
              <Phone className="h-3.5 w-3.5 text-zinc-400" />
              +1
            </div>
            <input
              type="tel"
              placeholder="(555) 000-0000"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && savePhone()}
              className="flex-1 px-3 py-3.5 text-sm outline-none bg-white placeholder:text-zinc-300 text-zinc-900"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-red-500 text-xs mb-3 px-1">{error}</p>
          )}

          <button
            onClick={savePhone}
            disabled={!phone || loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-6 py-3.5 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-1"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
            ) : (
              <>Continue to Booking <ArrowRight className="h-3.5 w-3.5" /></>
            )}
          </button>
        </div>

        <p className="text-center text-[10px] tracking-wide text-zinc-400 mt-5">
          Used only for appointment notifications. Never shared.
        </p>
      </div>
    </div>
  )
}
