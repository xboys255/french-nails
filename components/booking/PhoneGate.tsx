'use client'

import { useState } from 'react'
import { Phone, ArrowRight, ArrowLeft } from 'lucide-react'
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

type Step = 'phone' | 'otp'

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return raw.startsWith('+') ? raw : `+${digits}`
}

export default function PhoneGate({ profile, services, staffList, locale }: Props) {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifiedProfile, setVerifiedProfile] = useState<Profile | null>(null)

  const e164 = toE164(phone)

  // After successful OTP verification → show booking wizard
  if (verifiedProfile) {
    return (
      <BookingWizard
        services={services}
        staffList={staffList}
        profile={verifiedProfile}
        locale={locale}
      />
    )
  }

  // ── Step 1: send OTP ────────────────────────────────────────────
  async function sendCode() {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) {
      setError('Please enter a valid 10-digit phone number.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    // updateUser({ phone }) sends an OTP to verify the new phone number
    const { error: updateError } = await supabase.auth.updateUser({ phone: e164 })
    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setStep('otp')
  }

  // ── Step 2: verify OTP then persist to profiles ─────────────────
  async function verifyCode() {
    if (otp.length < 6) return

    setLoading(true)
    setError('')

    const supabase = createClient()

    // Verify the phone-change OTP
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: e164,
      token: otp,
      type: 'phone_change',
    })

    if (verifyError) {
      setLoading(false)
      setError('Invalid or expired code. Please try again.')
      return
    }

    // OTP verified — persist verified phone to profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ phone: e164 })
      .eq('id', profile.id)

    setLoading(false)

    if (profileError) {
      setError(profileError.message)
      return
    }

    setVerifiedProfile({ ...profile, phone: e164 })
  }

  // ── Resend code ─────────────────────────────────────────────────
  async function resend() {
    setOtp('')
    setError('')
    await sendCode()
  }

  const inputBase =
    'flex-1 px-3 py-3.5 text-sm outline-none bg-white placeholder:text-zinc-300 text-zinc-900'

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">

        {/* Logo */}
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

          {step === 'phone' && (
            <>
              <h2
                className="text-2xl font-light text-center text-zinc-900 tracking-tight mb-2"
                style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
              >
                Verify your number
              </h2>
              <p className="text-xs text-center text-zinc-400 tracking-wide leading-relaxed mb-7">
                We'll send a one-time code to confirm<br />your phone number before booking.
              </p>

              {/* Phone input */}
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
                  onKeyDown={e => e.key === 'Enter' && sendCode()}
                  className={inputBase}
                  autoFocus
                />
              </div>

              {error && <p className="text-red-500 text-xs mb-3 px-1">{error}</p>}

              <button
                onClick={sendCode}
                disabled={!phone || loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-6 py-3.5 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-1"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                  : <>Send Verification Code <ArrowRight className="h-3.5 w-3.5" /></>}
              </button>
            </>
          )}

          {step === 'otp' && (
            <>
              {/* Back */}
              <button
                onClick={() => { setStep('phone'); setOtp(''); setError('') }}
                className="flex items-center gap-1.5 text-xs tracking-widest uppercase text-zinc-400 hover:text-zinc-900 mb-6 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Change number
              </button>

              <h2
                className="text-2xl font-light text-center text-zinc-900 tracking-tight mb-2"
                style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
              >
                Enter the code
              </h2>
              <p className="text-xs text-center text-zinc-400 tracking-wide leading-relaxed mb-1">
                Sent to
              </p>
              <p className="text-sm text-center text-zinc-700 font-medium mb-6">{e164}</p>

              {/* OTP input */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError('') }}
                onKeyDown={e => e.key === 'Enter' && verifyCode()}
                className="w-full text-center text-3xl tracking-[0.5em] font-light border border-zinc-200 rounded-xl py-4 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors text-zinc-900 placeholder:text-zinc-200 mb-4"
                autoFocus
              />

              {error && <p className="text-red-500 text-xs mb-3 px-1 text-center">{error}</p>}

              <button
                onClick={verifyCode}
                disabled={otp.length < 6 || loading}
                className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-6 py-3.5 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed mb-3"
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                  : <>Verify & Continue <ArrowRight className="h-3.5 w-3.5" /></>}
              </button>

              <button
                onClick={resend}
                disabled={loading}
                className="w-full py-2.5 text-xs tracking-widest uppercase text-zinc-400 hover:text-zinc-900 transition-colors disabled:opacity-40"
              >
                Resend Code
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] tracking-wide text-zinc-400 mt-5">
          Used only for appointment confirmations. Never shared.
        </p>
      </div>
    </div>
  )
}
