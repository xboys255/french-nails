'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Phone, ArrowRight, X, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import type { Profile } from '@/types'

interface Props {
  profile: Profile | null
  locale: string
}

type PhoneStep = 'idle' | 'enter' | 'otp'

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return raw.startsWith('+') ? raw : `+${digits}`
}

export default function ClientProfile({ profile, locale }: Props) {
  const t = useTranslations('profile')
  const supabase = createClient()

  // ── Profile fields ──────────────────────────────────────────────
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [email, setEmail] = useState(profile?.email ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  // ── Phone change flow ───────────────────────────────────────────
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('idle')
  const [newPhone, setNewPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [currentPhone, setCurrentPhone] = useState(profile?.phone ?? '')
  const [phoneLoading, setPhoneLoading] = useState(false)
  const [phoneError, setPhoneError] = useState('')
  const [phoneSuccess, setPhoneSuccess] = useState(false)

  const e164 = toE164(newPhone)

  // ── Save name / email ────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    setSaveError('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, email })
      .eq('id', profile!.id)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  // ── Step 1: send OTP to new number ──────────────────────────────
  async function sendOtp() {
    const digits = newPhone.replace(/\D/g, '')
    if (digits.length < 10) {
      setPhoneError('Enter a valid 10-digit number.')
      return
    }
    setPhoneLoading(true)
    setPhoneError('')
    const { error } = await supabase.auth.updateUser({ phone: e164 })
    setPhoneLoading(false)
    if (error) { setPhoneError(error.message); return }
    setPhoneStep('otp')
  }

  // ── Step 2: verify OTP then persist ─────────────────────────────
  async function verifyOtp() {
    if (otp.length < 6) return
    setPhoneLoading(true)
    setPhoneError('')

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: e164,
      token: otp,
      type: 'phone_change',
    })

    if (verifyError) {
      setPhoneLoading(false)
      setPhoneError('Invalid or expired code. Please try again.')
      return
    }

    // Persist verified phone to profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ phone: e164 })
      .eq('id', profile!.id)

    setPhoneLoading(false)
    if (profileError) { setPhoneError(profileError.message); return }

    setCurrentPhone(e164)
    setPhoneStep('idle')
    setNewPhone('')
    setOtp('')
    setPhoneSuccess(true)
    setTimeout(() => setPhoneSuccess(false), 3000)
  }

  function cancelPhoneChange() {
    setPhoneStep('idle')
    setNewPhone('')
    setOtp('')
    setPhoneError('')
  }

  return (
    <div>
      <h1
        className="text-[clamp(1.6rem,4vw,2.2rem)] font-light tracking-tight text-zinc-900 mb-8"
        style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
      >
        {t('title')}
      </h1>

      <Card className="border-zinc-100 shadow-sm">
        <CardContent className="p-6 space-y-5">

          {/* Full name */}
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">
              {t('fullName')}
            </label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} />
          </div>

          {/* Phone — with inline change + OTP flow */}
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">
              {t('phone')}
            </label>

            {/* idle: show current phone + Change button */}
            {phoneStep === 'idle' && (
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 border border-zinc-200 rounded-lg bg-zinc-50 text-sm text-zinc-700">
                  <Phone className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                  {currentPhone || <span className="text-zinc-300">Not set</span>}
                </div>
                <button
                  onClick={() => setPhoneStep('enter')}
                  className="text-[10px] tracking-widest uppercase font-medium text-zinc-500 hover:text-zinc-900 border border-zinc-200 hover:border-zinc-400 px-3 py-2.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Change
                </button>
              </div>
            )}

            {/* enter: new phone number input */}
            {phoneStep === 'enter' && (
              <div className="space-y-2">
                <div className="flex border border-zinc-200 rounded-xl overflow-hidden focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-colors">
                  <div className="flex items-center gap-1.5 px-3 bg-zinc-50 border-r border-zinc-200 text-xs font-medium text-zinc-500 select-none flex-shrink-0">
                    <Phone className="h-3.5 w-3.5 text-zinc-400" /> +1
                  </div>
                  <input
                    type="tel"
                    placeholder="New phone number"
                    value={newPhone}
                    onChange={e => { setNewPhone(e.target.value); setPhoneError('') }}
                    onKeyDown={e => e.key === 'Enter' && sendOtp()}
                    className="flex-1 px-3 py-3 text-sm outline-none bg-white placeholder:text-zinc-300 text-zinc-900"
                    autoFocus
                  />
                </div>
                {phoneError && <p className="text-red-500 text-xs px-1">{phoneError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={cancelPhoneChange}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-full transition-colors"
                  >
                    <X className="h-3 w-3" /> Cancel
                  </button>
                  <button
                    onClick={sendOtp}
                    disabled={!newPhone || phoneLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-4 py-2.5 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-30"
                  >
                    {phoneLoading
                      ? <span className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                      : <>Send Code <ArrowRight className="h-3 w-3" /></>}
                  </button>
                </div>
              </div>
            )}

            {/* otp: verify code */}
            {phoneStep === 'otp' && (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Enter the 6-digit code sent to <span className="text-zinc-700 font-medium">{e164}</span>
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setPhoneError('') }}
                  onKeyDown={e => e.key === 'Enter' && verifyOtp()}
                  className="w-full text-center text-2xl tracking-[0.4em] font-light border border-zinc-200 rounded-xl py-3 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors text-zinc-900 placeholder:text-zinc-200"
                  autoFocus
                />
                {phoneError && <p className="text-red-500 text-xs px-1">{phoneError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setPhoneStep('enter'); setOtp(''); setPhoneError('') }}
                    className="flex items-center gap-1.5 px-4 py-2.5 text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 border border-zinc-200 rounded-full transition-colors"
                  >
                    <X className="h-3 w-3" /> Back
                  </button>
                  <button
                    onClick={verifyOtp}
                    disabled={otp.length < 6 || phoneLoading}
                    className="flex-1 flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-4 py-2.5 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-30"
                  >
                    {phoneLoading
                      ? <span className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
                      : <>Verify <ArrowRight className="h-3 w-3" /></>}
                  </button>
                </div>
                <button
                  onClick={sendOtp}
                  disabled={phoneLoading}
                  className="w-full text-xs tracking-widest uppercase text-zinc-400 hover:text-zinc-900 transition-colors py-1"
                >
                  Resend Code
                </button>
              </div>
            )}

            {phoneSuccess && (
              <p className="flex items-center gap-1.5 text-green-600 text-xs mt-1">
                <Check className="h-3.5 w-3.5" /> Phone number updated successfully.
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">
              {t('email')}
            </label>
            <Input value={email} onChange={e => setEmail(e.target.value)} type="email" />
          </div>

          {saved && (
            <p className="flex items-center gap-1.5 text-green-600 text-xs">
              <Check className="h-3.5 w-3.5" /> {t('saved')}
            </p>
          )}
          {saveError && <p className="text-red-500 text-xs">{saveError}</p>}

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : t('save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
