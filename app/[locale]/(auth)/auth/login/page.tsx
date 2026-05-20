'use client'

import { Suspense, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { Phone, ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/shared/Logo'

type Method = 'phone' | 'email'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}


export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [method, setMethod] = useState<Method>('phone')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [error, setError] = useState(searchParams.get('error') === 'oauth' ? 'OAuth sign-in failed. Please try again.' : '')

  // Restore remembered email
  useEffect(() => {
    const saved = localStorage.getItem('fn_remembered_email')
    if (saved) { setEmail(saved); setRememberMe(true); setMethod('email') }
  }, [])

  function toE164(raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 10) return `+1${digits}`
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
    return raw.startsWith('+') ? raw : `+${digits}`
  }
  const e164 = toE164(phone)

  async function redirectByRole(userId: string) {
    // Honour ?next= param (e.g. redirected from /book)
    const next = searchParams.get('next')
    if (next && next.startsWith('/')) {
      router.push(next)
      router.refresh()
      return
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single()
    const role = profile?.role ?? 'client'
    if (role === 'admin') router.push(`/${locale}/admin`)
    else if (role === 'staff') router.push(`/${locale}/staff`)
    else router.push(`/${locale}/client/appointments`)
    router.refresh()
  }

  async function sendOtp() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 })
    setLoading(false)
    if (error) { setError(error.message); return }
    setStep('otp')
  }

  async function verifyOtp() {
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token: otp, type: 'sms' })
    setLoading(false)
    if (error) { setError(error.message); return }
    await redirectByRole(data.user!.id)
  }

  async function signInWithEmail() {
    setLoading(true); setError('')
    if (rememberMe) localStorage.setItem('fn_remembered_email', email)
    else localStorage.removeItem('fn_remembered_email')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    await redirectByRole(data.user.id)
  }

  async function signInWithOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider); setError('')
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const inputCls = 'w-full px-4 py-3 text-sm border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors placeholder:text-zinc-300 text-zinc-900 bg-white'
  const pillBtn = (disabled?: boolean) =>
    `w-full py-3.5 rounded-full text-xs tracking-widest uppercase font-medium transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''} bg-zinc-900 text-white hover:bg-zinc-700`

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <LogoMark className="h-9 w-8 text-zinc-900" color="#17171c" />
            <span
              className="text-base font-light tracking-[0.22em] uppercase text-zinc-900"
              style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
            >
              French Nails
            </span>
          </div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-[22px] shadow-sm border border-zinc-100 p-7">

          {/* OAuth buttons — always visible */}
          {step === 'phone' && (
            <div className="space-y-2.5 mb-6">
              <button
                onClick={() => signInWithOAuth('google')}
                disabled={!!oauthLoading}
                className="w-full flex items-center justify-center gap-3 border border-zinc-200 rounded-full py-3 text-xs tracking-widest uppercase font-medium text-zinc-700 hover:border-zinc-900 transition-colors disabled:opacity-40"
              >
                {oauthLoading === 'google'
                  ? <span className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-700 rounded-full animate-spin" />
                  : <GoogleIcon />}
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 pt-1">
                <div className="h-px flex-1 bg-zinc-100" />
                <span className="text-[10px] tracking-[0.15em] uppercase text-zinc-300">or</span>
                <div className="h-px flex-1 bg-zinc-100" />
              </div>
            </div>
          )}

          {/* Method toggle */}
          {step === 'phone' && (
            <div className="flex border border-zinc-200 rounded-full p-1 mb-6">
              <button
                onClick={() => { setMethod('phone'); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs tracking-widest uppercase font-medium transition-colors ${
                  method === 'phone' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                <Phone className="h-3.5 w-3.5" /> Phone
              </button>
              <button
                onClick={() => { setMethod('email'); setError('') }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-xs tracking-widest uppercase font-medium transition-colors ${
                  method === 'email' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-700'
                }`}
              >
                <Mail className="h-3.5 w-3.5" /> Email
              </button>
            </div>
          )}

          {/* Phone flow */}
          {method === 'phone' && step === 'phone' && (
            <>
              <div className="flex mb-5 border border-zinc-200 rounded-xl overflow-hidden focus-within:border-zinc-900 focus-within:ring-1 focus-within:ring-zinc-900 transition-colors">
                <div className="flex items-center gap-1.5 px-3 bg-zinc-50 border-r border-zinc-200 text-xs font-medium text-zinc-500 select-none">
                  <Phone className="h-3.5 w-3.5 text-zinc-400" /> +1
                </div>
                <input
                  type="tel"
                  placeholder="(707) 858-8161"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="flex-1 px-3 py-3 text-sm outline-none bg-white placeholder:text-zinc-300 text-zinc-900"
                />
              </div>
              {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
              <button onClick={sendOtp} disabled={!phone || loading} className={pillBtn(!phone || loading)}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </>
          )}

          {method === 'phone' && step === 'otp' && (
            <>
              <button
                onClick={() => setStep('phone')}
                className="flex items-center gap-1.5 text-xs tracking-widest uppercase text-zinc-400 hover:text-zinc-900 mb-6 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </button>
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2">Enter code</div>
              <p className="text-sm text-zinc-500 mb-5 font-medium">{e164}</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-3xl tracking-[0.5em] font-light border border-zinc-200 rounded-xl py-4 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors text-zinc-900 placeholder:text-zinc-200 mb-5"
              />
              {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
              <button onClick={verifyOtp} disabled={otp.length < 6 || loading} className={`${pillBtn(otp.length < 6 || loading)} mb-3`}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                onClick={sendOtp}
                disabled={loading}
                className="w-full py-2.5 text-xs tracking-widest uppercase text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                Resend Code
              </button>
            </>
          )}

          {/* Email flow */}
          {method === 'email' && (
            <>
              <div className="space-y-3 mb-4">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputCls}
                />
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && signInWithEmail()}
                    className={`${inputCls} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 mb-5 cursor-pointer group">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                    rememberMe ? 'bg-zinc-900 border-zinc-900' : 'border-zinc-300 bg-white group-hover:border-zinc-600'
                  }`}
                >
                  {rememberMe && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-zinc-500 select-none">Remember my username</span>
              </label>

              {error && <p className="text-red-500 text-xs mb-4">{error}</p>}
              <button
                onClick={signInWithEmail}
                disabled={!email || !password || loading}
                className={pillBtn(!email || !password || loading)}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-[10px] tracking-wide text-zinc-400 mt-6">
          By signing in you agree to our terms of service.
        </p>
      </div>
    </div>
  )
}
