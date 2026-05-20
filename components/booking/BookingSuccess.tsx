'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { BookingState } from './BookingWizard'
import { formatDate, formatTime } from '@/lib/utils'
import { LogoMark } from '@/components/shared/Logo'

export default function BookingSuccess({ booking, locale }: { booking: BookingState; locale: string }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-16">
      <div className="max-w-sm w-full text-center">

        {/* Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center">
            <LogoMark className="h-8 w-7 text-white" color="white" />
          </div>
        </div>

        <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">Confirmed</div>
        <h1
          className="text-3xl font-light text-zinc-900 tracking-tight mb-3"
          style={{ fontFamily: 'var(--font-cormorant), serif' }}
        >
          You're all set.
        </h1>
        <p className="text-sm text-zinc-400 mb-10 leading-relaxed">
          Check your phone and email for confirmation details.
        </p>

        {/* Summary card */}
        <div className="border border-zinc-100 rounded-2xl p-5 text-left mb-8 space-y-3">
          <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">Your appointment</div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Date</span>
            <span className="text-zinc-900 font-medium">{formatDate(booking.selectedDate)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Time</span>
            <span className="text-zinc-900 font-medium">{formatTime(booking.selectedTime)}</span>
          </div>
          {booking.selectedStaff && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Nail Tech</span>
              <span className="text-zinc-900 font-medium">{booking.selectedStaff.profile?.full_name}</span>
            </div>
          )}
          <div className="border-t border-zinc-100 pt-3 space-y-1">
            {booking.selectedServices.map(s => (
              <div key={s.id} className="text-sm text-zinc-600">{s.name_en}</div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={`/${locale}/client/appointments`}
            className="inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-7 py-3.5 rounded-full hover:bg-zinc-700 transition-colors"
          >
            View My Appointments <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={`/${locale}/book`}
            className="text-xs tracking-widest uppercase text-zinc-400 hover:text-zinc-900 transition-colors underline underline-offset-4"
          >
            Book Another
          </Link>
        </div>
      </div>
    </div>
  )
}
