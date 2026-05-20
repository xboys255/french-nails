'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import type { BookingState } from './BookingWizard'
import { ChevronLeft, ArrowRight, Bell, BellOff } from 'lucide-react'
import { formatTime } from '@/lib/utils'

function WaitlistSection({ booking, onBack, noSlotsText }: { booking: BookingState; onBack: () => void; noSlotsText: string }) {
  const [joined, setJoined] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function joinWaitlist() {
    setLoading(true); setError('')
    const res = await fetch('/api/waitlist/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: booking.selectedDate,
        staffId: booking.selectedStaff?.id ?? null,
        serviceIds: booking.selectedServices.map(s => s.id),
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error === 'Unauthorized') { setError('Please sign in to join the waitlist.'); return }
    if (data.error) { setError(data.error); return }
    setJoined(true)
  }

  return (
    <div className="text-center py-14 border border-zinc-100 rounded-2xl mb-8">
      {joined ? (
        <>
          <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-4">
            <Bell className="h-5 w-5 text-white" />
          </div>
          <p className="text-sm font-medium text-zinc-900 mb-1">You're on the waitlist</p>
          <p className="text-xs text-zinc-400 mb-5">We'll notify you if a spot opens up on this date.</p>
          <button onClick={onBack} className="text-xs tracking-widest uppercase text-zinc-500 underline underline-offset-4">
            Try another date
          </button>
        </>
      ) : (
        <>
          <BellOff className="h-6 w-6 text-zinc-300 mx-auto mb-4" />
          <p className="text-sm text-zinc-500 mb-1">{noSlotsText}</p>
          <p className="text-xs text-zinc-400 mb-6">No times available on this date.</p>
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={joinWaitlist}
              disabled={loading}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-6 py-3 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-40"
            >
              <Bell className="h-3.5 w-3.5" />
              {loading ? 'Joining...' : 'Join waitlist'}
            </button>
            <button onClick={onBack} className="text-xs tracking-widest uppercase text-zinc-400 underline underline-offset-4">
              Change date
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface Props {
  booking: BookingState
  setBooking: (b: BookingState) => void
  onNext: () => void
  onBack: () => void
}

interface SlotData {
  time: string
  available: boolean
}

export default function StepTime({ booking, setBooking, onNext, onBack }: Props) {
  const t = useTranslations('booking')
  const [slots, setSlots] = useState<SlotData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSlots() {
      setLoading(true)
      const params = new URLSearchParams({
        date: booking.selectedDate,
        duration: String(booking.selectedServices.reduce((a, s) => a + s.duration_minutes, 0)),
        staffId: booking.selectedStaff?.id ?? '',
      })
      const res = await fetch(`/api/availability?${params}`)
      const data = await res.json()
      setSlots(data.slots ?? [])
      setLoading(false)
    }
    fetchSlots()
  }, [booking.selectedDate, booking.selectedStaff, booking.selectedServices])

  const hasSlots = slots.some(s => s.available)

  return (
    <div>
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2">Step 3</div>
        <h2
          className="text-2xl font-light text-zinc-900 tracking-tight"
          style={{ fontFamily: 'var(--font-cormorant), serif' }}
        >
          Pick a time
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : !hasSlots ? (
        <WaitlistSection booking={booking} onBack={onBack} noSlotsText={t('noSlots')} />

      ) : (
        <>
          <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3 pb-2 border-b border-zinc-100">
            Available times
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8">
            {slots.map(slot => (
              <button
                key={slot.time}
                disabled={!slot.available}
                onClick={() => setBooking({ ...booking, selectedTime: slot.time })}
                className={`py-3.5 rounded-xl text-xs font-medium tracking-wide transition-all border touch-manipulation ${
                  !slot.available
                    ? 'border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed'
                    : booking.selectedTime === slot.time
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-900 active:bg-zinc-50'
                }`}
              >
                {formatTime(slot.time)}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-5 py-3 rounded-full transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!booking.selectedTime}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-6 py-3 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
