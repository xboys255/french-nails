'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import type { Service, Staff, Profile } from '@/types'
import StepServices from './StepServices'
import StepStaffDate from './StepStaffDate'
import StepTime from './StepTime'
import StepConfirm from './StepConfirm'
import BookingSuccess from './BookingSuccess'

interface Props {
  services: Service[]
  staffList: Staff[]
  profile: Profile | null
  locale: string
}

export type BookingState = {
  selectedServices: Service[]
  selectedStaff: Staff | null
  selectedDate: string
  selectedTime: string
  notes: string
  promoCode: string
  promoCodeId: string | null
  discountAmount: number
  giftCardCode: string
  giftCardId: string | null
  giftCardDiscount: number
  loyaltyPointsRedeemed: number
  loyaltyDiscount: number
  clientSecret: string | null
  appointmentId: string | null
}

const STEP_LABELS = ['Services', 'Staff & Date', 'Time', 'Confirm']

export default function BookingWizard({ services, staffList, profile, locale }: Props) {
  const t = useTranslations('booking')

  const [step, setStep] = useState(0)
  const [booking, setBooking] = useState<BookingState>({
    selectedServices: [],
    selectedStaff: null,
    selectedDate: '',
    selectedTime: '',
    notes: '',
    promoCode: '',
    promoCodeId: null,
    discountAmount: 0,
    giftCardCode: '',
    giftCardId: null,
    giftCardDiscount: 0,
    loyaltyPointsRedeemed: 0,
    loyaltyDiscount: 0,
    clientSecret: null,
    appointmentId: null,
  })
  const [success, setSuccess] = useState(false)

  if (success) return <BookingSuccess booking={booking} locale={locale} />

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-zinc-100 bg-white sticky top-0 z-10">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <h1
            className="text-center text-sm tracking-[0.2em] uppercase text-zinc-400 mb-5"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            Book an Appointment
          </h1>

          {/* Step indicator */}
          <div className="flex items-center justify-center">
            {STEP_LABELS.map((label, i) => (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border transition-colors ${
                      i < step
                        ? 'bg-zinc-900 border-zinc-900 text-white'
                        : i === step
                        ? 'border-zinc-900 text-zinc-900 bg-white'
                        : 'border-zinc-200 text-zinc-300 bg-white'
                    }`}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`mt-1.5 text-[9px] tracking-[0.15em] uppercase hidden sm:block ${
                      i === step ? 'text-zinc-900' : 'text-zinc-300'
                    }`}
                  >
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className={`h-px w-8 sm:w-14 mx-1 mb-0 sm:mb-4 transition-colors ${
                      i < step ? 'bg-zinc-900' : 'bg-zinc-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="mx-auto max-w-2xl px-4 py-8 pb-28">
        {step === 0 && (
          <StepServices services={services} booking={booking} setBooking={setBooking} onNext={() => setStep(1)} locale={locale} />
        )}
        {step === 1 && (
          <StepStaffDate staffList={staffList} booking={booking} setBooking={setBooking} onNext={() => setStep(2)} onBack={() => setStep(0)} />
        )}
        {step === 2 && (
          <StepTime booking={booking} setBooking={setBooking} onNext={() => setStep(3)} onBack={() => setStep(1)} />
        )}
        {step === 3 && (
          <StepConfirm booking={booking} setBooking={setBooking} profile={profile} onBack={() => setStep(2)} onSuccess={() => setSuccess(true)} locale={locale} />
        )}
      </div>
    </div>
  )
}
