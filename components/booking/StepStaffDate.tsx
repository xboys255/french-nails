'use client'

import { useTranslations } from 'next-intl'
import { format, addDays, startOfToday, isToday } from 'date-fns'
import type { Staff } from '@/types'
import type { BookingState } from './BookingWizard'
import { ChevronLeft, ArrowRight } from 'lucide-react'

// Map any pink/rose/fuchsia hex values to neutral zinc so they never appear on the booking page
const PINK_PATTERN = /^#(f9a8d4|f472b6|ec4899|db2777|be185d|9d174d|831843|fda4af|fb7185|f43f5e|e11d48|be123c|9f1239|881337|ff69b4|ff1493|c71585|ffb6c1|ffc0cb)/i
function sanitizeColor(color: string | null | undefined): string {
  if (!color) return '#17171c'
  if (PINK_PATTERN.test(color.trim())) return '#3f3f46'
  return color
}

interface Props {
  staffList: Staff[]
  booking: BookingState
  setBooking: (b: BookingState) => void
  onNext: () => void
  onBack: () => void
}

export default function StepStaffDate({ staffList, booking, setBooking, onNext, onBack }: Props) {
  const t = useTranslations('booking')

  const today = startOfToday()
  const dates = Array.from({ length: 30 }, (_, i) => addDays(today, i))

  function selectStaff(staff: Staff | null) {
    setBooking({ ...booking, selectedStaff: staff, selectedDate: '', selectedTime: '' })
  }

  function selectDate(date: Date) {
    setBooking({ ...booking, selectedDate: format(date, 'yyyy-MM-dd'), selectedTime: '' })
  }

  const canContinue = !!booking.selectedDate

  return (
    <div>
      {/* Staff */}
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2">Step 2</div>
        <h2
          className="text-2xl font-light text-zinc-900 tracking-tight mb-6"
          style={{ fontFamily: 'var(--font-cormorant), serif' }}
        >
          Choose your nail tech
        </h2>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {/* Any staff */}
          <button
            onClick={() => selectStaff(null)}
            className={`p-3 rounded-xl border transition-all touch-manipulation text-center ${
              booking.selectedStaff === null
                ? 'border-zinc-900 bg-zinc-900'
                : 'border-zinc-200 bg-white hover:border-zinc-400'
            }`}
          >
            <div className={`w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-2 text-xl border ${
              booking.selectedStaff === null ? 'bg-zinc-700 border-zinc-600' : 'bg-zinc-50 border-zinc-200'
            }`}>
              ✦
            </div>
            <p className={`text-xs font-medium leading-tight ${booking.selectedStaff === null ? 'text-white' : 'text-zinc-700'}`}>
              Any Tech
            </p>
          </button>

          {staffList.map(staff => {
            const selected = booking.selectedStaff?.id === staff.id
            return (
              <button
                key={staff.id}
                onClick={() => selectStaff(staff)}
                className={`p-3 rounded-xl border transition-all touch-manipulation text-center ${
                  selected
                    ? 'border-zinc-900 bg-zinc-900'
                    : 'border-zinc-200 bg-white hover:border-zinc-400'
                }`}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-2 text-white font-semibold text-base"
                  style={{ backgroundColor: selected ? '#52525b' : sanitizeColor(staff.color) }}
                >
                  {staff.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <p className={`text-xs font-medium truncate leading-tight ${selected ? 'text-white' : 'text-zinc-700'}`}>
                  {staff.profile?.full_name?.split(' ')[0] ?? 'Staff'}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Date */}
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-4 pb-2 border-b border-zinc-100">
          Select a date
        </div>
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory scrollbar-none">
          {dates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd')
            const selected = booking.selectedDate === dateStr
            const todayDate = isToday(date)
            return (
              <button
                key={dateStr}
                onClick={() => selectDate(date)}
                className={`flex-shrink-0 flex flex-col items-center py-3 px-3 rounded-xl border min-w-[60px] min-h-[76px] transition-all snap-start touch-manipulation ${
                  selected
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white hover:border-zinc-400 text-zinc-700'
                }`}
              >
                <span className={`text-[10px] tracking-wide font-medium uppercase ${selected ? 'text-zinc-400' : 'text-zinc-400'}`}>
                  {todayDate ? 'Today' : format(date, 'EEE')}
                </span>
                <span className={`text-xl font-light leading-tight my-0.5 ${selected ? 'text-white' : 'text-zinc-900'}`}>
                  {format(date, 'd')}
                </span>
                <span className={`text-[10px] ${selected ? 'text-zinc-400' : 'text-zinc-400'}`}>
                  {format(date, 'MMM')}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Nav */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 border border-zinc-200 px-5 py-3 rounded-full transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back
        </button>
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-6 py-3 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Continue <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
