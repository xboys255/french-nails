'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Elements, PaymentElement, PaymentRequestButtonElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import type { PaymentRequest } from '@stripe/stripe-js'
import type { BookingState } from './BookingWizard'
import type { Profile } from '@/types'
import { Input } from '@/components/ui/input'
import { ChevronLeft, ArrowRight, Tag, Gift, Store, CreditCard, Star } from 'lucide-react'
import { formatCurrency, formatDate, formatTime, DEPOSIT_PERCENTAGE, POINTS_REDEMPTION_RATE } from '@/lib/utils'
import Link from 'next/link'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Props {
  booking: BookingState
  setBooking: (b: BookingState) => void
  profile: Profile | null
  onBack: () => void
  onSuccess: () => void
  locale: string
}

function PaymentForm({ onSuccess, clientSecret, deposit }: { onSuccess: () => void; clientSecret: string; deposit: number }) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)

  useEffect(() => {
    if (!stripe) return
    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: { label: 'French Nails Deposit', amount: deposit },
      requestPayerName: false,
      requestPayerEmail: false,
    })
    pr.canMakePayment().then(result => {
      if (result) setPaymentRequest(pr)
    })
    pr.on('paymentmethod', async (ev) => {
      const { error: confirmError } = await stripe.confirmCardPayment(
        clientSecret,
        { payment_method: ev.paymentMethod.id },
        { handleActions: false }
      )
      if (confirmError) { ev.complete('fail'); setError(confirmError.message ?? 'Payment failed') }
      else { ev.complete('success'); onSuccess() }
    })
  }, [stripe])

  async function handlePay() {
    if (!stripe || !elements) return
    setLoading(true); setError('')
    const { error } = await stripe.confirmPayment({ elements, redirect: 'if_required' })
    setLoading(false)
    if (error) { setError(error.message ?? 'Payment failed'); return }
    onSuccess()
  }

  return (
    <div className="space-y-4">
      {paymentRequest && (
        <>
          <PaymentRequestButtonElement
            options={{
              paymentRequest,
              style: { paymentRequestButton: { theme: 'dark', height: '48px', borderRadius: '999px' } },
            }}
          />
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-100" />
            <span className="text-[10px] tracking-[0.15em] uppercase text-zinc-400">or pay by card</span>
            <div className="h-px flex-1 bg-zinc-100" />
          </div>
        </>
      )}
      <PaymentElement className="mb-2" />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium py-4 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay ${formatCurrency(deposit)} & Confirm`}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export default function StepConfirm({ booking, setBooking, profile, onBack, onSuccess, locale }: Props) {
  const [notes, setNotes] = useState(booking.notes)
  const [promoInput, setPromoInput] = useState(booking.promoCode)
  const [promoMsg, setPromoMsg] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [giftInput, setGiftInput] = useState(booking.giftCardCode)
  const [giftMsg, setGiftMsg] = useState('')
  const [giftLoading, setGiftLoading] = useState(false)
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [loyaltyLoading, setLoyaltyLoading] = useState(false)
  const [loyaltyMsg, setLoyaltyMsg] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState<'deposit' | 'salon' | null>(null)
  const [checkoutError, setCheckoutError] = useState('')
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  const subtotal = booking.selectedServices.reduce((a, s) => a + s.price, 0)
  const afterPromo = Math.max(0, subtotal - booking.discountAmount)
  const afterGift = Math.max(0, afterPromo - booking.giftCardDiscount)
  const afterLoyalty = Math.max(0, afterGift - booking.loyaltyDiscount)
  const deposit = Math.round(afterLoyalty * DEPOSIT_PERCENTAGE)

  async function applyPromo() {
    setPromoLoading(true); setPromoMsg('')
    const res = await fetch('/api/promo/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: promoInput, orderAmount: subtotal }),
    })
    const data = await res.json()
    setPromoLoading(false)
    if (data.error) { setPromoMsg('Invalid or expired promo code.'); return }
    setBooking({ ...booking, promoCode: promoInput, promoCodeId: data.id, discountAmount: data.discountAmount })
    setPromoMsg('Promo applied!')
  }

  async function loadLoyaltyBalance() {
    setLoyaltyLoading(true)
    const res = await fetch('/api/loyalty/balance')
    const data = await res.json()
    setLoyaltyLoading(false)
    if (!data.error) setLoyaltyPoints(data.points ?? 0)
  }

  async function applyLoyalty() {
    if (!loyaltyPoints) return
    const maxDiscount = Math.min(Math.floor(loyaltyPoints / POINTS_REDEMPTION_RATE) * 100, afterGift)
    const pointsNeeded = Math.ceil(maxDiscount / 100) * POINTS_REDEMPTION_RATE
    setBooking({ ...booking, loyaltyPointsRedeemed: pointsNeeded, loyaltyDiscount: maxDiscount })
    setLoyaltyMsg(`${pointsNeeded.toLocaleString()} pts applied — ${formatCurrency(maxDiscount)} off`)
  }

  function removeLoyalty() {
    setBooking({ ...booking, loyaltyPointsRedeemed: 0, loyaltyDiscount: 0 })
    setLoyaltyMsg('')
  }

  async function applyGiftCard() {
    setGiftLoading(true); setGiftMsg('')
    const res = await fetch('/api/gift-card/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: giftInput }),
    })
    const data = await res.json()
    setGiftLoading(false)
    if (data.error) {
      const msgs: Record<string, string> = { invalid: 'Invalid gift card.', expired: 'Gift card expired.', depleted: 'No remaining balance.' }
      setGiftMsg(msgs[data.error] ?? 'Could not apply gift card.')
      return
    }
    const applied = Math.min(data.remainingBalance, afterPromo)
    setBooking({ ...booking, giftCardCode: giftInput, giftCardId: data.id, giftCardDiscount: applied })
    setGiftMsg(`${formatCurrency(applied)} applied from gift card.`)
  }

  async function startCheckout(method: 'deposit' | 'salon') {
    setCheckoutLoading(method); setCheckoutError('')
    try {
      const res = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceIds: booking.selectedServices.map(s => s.id),
          staffId: booking.selectedStaff?.id,
          date: booking.selectedDate,
          startTime: booking.selectedTime,
          notes,
          promoCodeId: booking.promoCodeId,
          giftCardId: booking.giftCardId,
          giftCardDiscount: booking.giftCardDiscount,
          loyaltyPointsRedeemed: booking.loyaltyPointsRedeemed,
          loyaltyDiscount: booking.loyaltyDiscount,
          payAtSalon: method === 'salon',
        }),
      })
      const data = await res.json()
      if (data.error) {
        setCheckoutError(
          data.error === 'Unauthorized'
            ? 'Please sign in to complete your booking.'
            : data.error
        )
        return
      }
      setBooking({ ...booking, clientSecret: data.clientSecret, appointmentId: data.appointmentId, notes })

      if (booking.giftCardId && booking.giftCardDiscount > 0) {
        fetch('/api/gift-card/redeem', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ giftCardId: booking.giftCardId, amount: booking.giftCardDiscount, appointmentId: data.appointmentId }),
        }).catch(() => {})
      }

      if (method === 'salon' || !data.clientSecret) {
        onSuccess()
      } else {
        setClientSecret(data.clientSecret)
      }
    } catch {
      setCheckoutError('Something went wrong. Please try again.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2">Step 4</div>
        <h2
          className="text-2xl font-light text-zinc-900 tracking-tight"
          style={{ fontFamily: 'var(--font-cormorant), serif' }}
        >
          Review & confirm
        </h2>
      </div>

      {/* Appointment summary */}
      <div className="border border-zinc-100 rounded-2xl p-5 mb-5 space-y-3">
        <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">Appointment summary</div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Date</span>
          <span className="text-zinc-900 font-medium">{formatDate(booking.selectedDate)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Time</span>
          <span className="text-zinc-900 font-medium">{formatTime(booking.selectedTime)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500">Nail Tech</span>
          <span className="text-zinc-900 font-medium">{booking.selectedStaff?.profile?.full_name ?? 'Any available'}</span>
        </div>
        <div className="border-t border-zinc-100 pt-3 space-y-1.5">
          {booking.selectedServices.map(s => (
            <div key={s.id} className="flex justify-between text-sm">
              <span className="text-zinc-600">{s.name_en}</span>
              <span className="text-zinc-900">{formatCurrency(s.price)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {!clientSecret && (
        <div className="mb-5">
          <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">
            Special requests (optional)
          </label>
          <Input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Allergies, preferences, nail shape..."
            className="rounded-xl border-zinc-200 text-sm"
          />
        </div>
      )}

      {/* Loyalty points */}
      {!clientSecret && (
        <div className="mb-5">
          <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">Loyalty Points</label>
          {booking.loyaltyDiscount > 0 ? (
            <div className="flex items-center justify-between bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-zinc-600" />
                <span className="text-sm text-zinc-900">{loyaltyMsg}</span>
              </div>
              <button onClick={removeLoyalty} className="text-xs text-zinc-400 hover:text-red-500 transition-colors underline">Remove</button>
            </div>
          ) : loyaltyPoints > 0 ? (
            <div className="flex items-center justify-between bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-600">{loyaltyPoints.toLocaleString()} pts available</span>
              <button
                onClick={applyLoyalty}
                className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase border border-zinc-200 px-3 py-1.5 rounded-full hover:border-zinc-900 transition-colors"
              >
                <Star className="h-3 w-3" /> Apply
              </button>
            </div>
          ) : (
            <button
              onClick={loadLoyaltyBalance}
              disabled={loyaltyLoading}
              className="text-xs text-zinc-400 hover:text-zinc-700 underline underline-offset-4 transition-colors"
            >
              {loyaltyLoading ? 'Loading...' : 'Check my points balance'}
            </button>
          )}
        </div>
      )}

      {/* Promo + Gift Card */}
      {!clientSecret && (
        <div className="space-y-3 mb-6">
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">Promo code</label>
            <div className="flex gap-2">
              <Input
                value={promoInput}
                onChange={e => setPromoInput(e.target.value.toUpperCase())}
                placeholder="Enter code"
                className="flex-1 rounded-xl border-zinc-200 text-sm font-mono"
              />
              <button
                onClick={applyPromo}
                disabled={promoLoading || !promoInput}
                className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase border border-zinc-200 px-4 py-2 rounded-full hover:border-zinc-900 transition-colors disabled:opacity-40"
              >
                <Tag className="h-3 w-3" /> Apply
              </button>
            </div>
            {promoMsg && (
              <p className={`text-xs mt-1.5 ${booking.promoCodeId ? 'text-green-600' : 'text-red-500'}`}>{promoMsg}</p>
            )}
          </div>
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">Gift card</label>
            <div className="flex gap-2">
              <Input
                value={giftInput}
                onChange={e => setGiftInput(e.target.value.toUpperCase())}
                placeholder="Gift card code"
                className="flex-1 rounded-xl border-zinc-200 text-sm font-mono"
              />
              <button
                onClick={applyGiftCard}
                disabled={giftLoading || !giftInput}
                className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase border border-zinc-200 px-4 py-2 rounded-full hover:border-zinc-900 transition-colors disabled:opacity-40"
              >
                <Gift className="h-3 w-3" /> Apply
              </button>
            </div>
            {giftMsg && (
              <p className={`text-xs mt-1.5 ${booking.giftCardId ? 'text-green-600' : 'text-red-500'}`}>{giftMsg}</p>
            )}
          </div>
        </div>
      )}

      {/* Pricing */}
      <div className="bg-zinc-50 rounded-2xl p-5 mb-6 space-y-2.5 text-sm">
        <div className="flex justify-between text-zinc-500">
          <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
        </div>
        {booking.discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Promo</span><span>−{formatCurrency(booking.discountAmount)}</span>
          </div>
        )}
        {booking.giftCardDiscount > 0 && (
          <div className="flex justify-between text-violet-600">
            <span>Gift card</span><span>−{formatCurrency(booking.giftCardDiscount)}</span>
          </div>
        )}
        {booking.loyaltyDiscount > 0 && (
          <div className="flex justify-between text-zinc-500">
            <span>Loyalty pts</span><span>−{formatCurrency(booking.loyaltyDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-zinc-900 border-t border-zinc-200 pt-2.5">
          <span>Total</span><span>{formatCurrency(afterLoyalty)}</span>
        </div>
        {deposit > 0 && (
          <div className="flex justify-between text-xs text-zinc-500 pt-0.5">
            <span>30% deposit due today</span>
            <span className="font-semibold text-zinc-900">{formatCurrency(deposit)}</span>
          </div>
        )}
      </div>

      {/* Error */}
      {checkoutError && (
        <div className="text-sm mb-5 p-4 bg-red-50 rounded-xl border border-red-100 text-red-600">
          {checkoutError}
          {checkoutError.includes('sign in') && (
            <Link href={`/${locale}/auth/login`} className="ml-2 underline font-medium">Sign in →</Link>
          )}
        </div>
      )}

      {/* Payment */}
      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm onSuccess={onSuccess} clientSecret={clientSecret} deposit={deposit} />
        </Elements>
      ) : (
        <div className="space-y-3">
          {/* Pay at salon */}
          <button
            onClick={() => startCheckout('salon')}
            disabled={!!checkoutLoading}
            className="w-full flex items-center gap-4 border border-zinc-200 rounded-2xl px-5 py-4 hover:border-zinc-900 transition-colors disabled:opacity-50 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <Store className="h-5 w-5 text-zinc-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900">Pay at salon</p>
              <p className="text-xs text-zinc-400 mt-0.5">Full amount due on the day of your visit</p>
            </div>
            {checkoutLoading === 'salon' && (
              <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin flex-shrink-0" />
            )}
          </button>

          {/* Pay deposit */}
          <button
            onClick={() => startCheckout('deposit')}
            disabled={!!checkoutLoading}
            className="w-full flex items-center gap-4 bg-zinc-900 rounded-2xl px-5 py-4 hover:bg-zinc-700 transition-colors disabled:opacity-50 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-5 w-5 text-zinc-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {deposit > 0 ? `Pay ${formatCurrency(deposit)} deposit` : 'Confirm & pay'}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {deposit > 0 ? 'Secure your spot · remaining balance due at salon' : 'Fully covered — no payment needed'}
              </p>
            </div>
            {checkoutLoading === 'deposit' ? (
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin flex-shrink-0" />
            ) : (
              <ArrowRight className="h-4 w-4 text-zinc-400 flex-shrink-0" />
            )}
          </button>

          {/* Back */}
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-zinc-400 hover:text-zinc-900 transition-colors pt-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
        </div>
      )}
    </div>
  )
}
