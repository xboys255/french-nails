'use client'

import { useTranslations } from 'next-intl'
import { Check, Clock } from 'lucide-react'
import type { Service } from '@/types'
import type { BookingState } from './BookingWizard'
import { formatCurrency } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

interface Props {
  services: Service[]
  booking: BookingState
  setBooking: (b: BookingState) => void
  onNext: () => void
  locale: string
}

export default function StepServices({ services, booking, setBooking, onNext, locale }: Props) {
  const t = useTranslations('booking')

  const categories = Array.from(new Set(services.map(s => s.category?.id))).map(id =>
    services.find(s => s.category?.id === id)?.category
  ).filter(Boolean)

  function toggle(service: Service) {
    const exists = booking.selectedServices.find(s => s.id === service.id)
    setBooking({
      ...booking,
      selectedServices: exists
        ? booking.selectedServices.filter(s => s.id !== service.id)
        : [...booking.selectedServices, service],
    })
  }

  const totalDuration = booking.selectedServices.reduce((a, s) => a + s.duration_minutes, 0)
  const totalPrice = booking.selectedServices.reduce((a, s) => a + s.price, 0)
  const hasSelected = booking.selectedServices.length > 0

  return (
    <div>
      <div className="mb-8">
        <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2">Step 1</div>
        <h2
          className="text-2xl font-light text-zinc-900 tracking-tight"
          style={{ fontFamily: 'var(--font-cormorant), serif' }}
        >
          Select your services
        </h2>
      </div>

      <div className="space-y-8">
        {categories.map(cat => (
          <div key={cat!.id}>
            <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3 pb-2 border-b border-zinc-100">
              {cat!.name_en}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {services.filter(s => s.category_id === cat!.id).map(service => {
                const selected = !!booking.selectedServices.find(s => s.id === service.id)
                return (
                  <button
                    key={service.id}
                    onClick={() => toggle(service)}
                    className={`text-left p-4 rounded-xl border transition-all touch-manipulation min-h-[72px] ${
                      selected
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white hover:border-zinc-400 text-zinc-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm leading-snug mb-1.5 ${selected ? 'text-white' : 'text-zinc-900'}`}>
                          {service.name_en}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center gap-1 text-xs ${selected ? 'text-zinc-400' : 'text-zinc-400'}`}>
                            <Clock className="h-3 w-3" />
                            {service.duration_minutes} min
                          </span>
                          <span className={`text-xs font-semibold ${selected ? 'text-zinc-300' : 'text-zinc-600'}`}>
                            {formatCurrency(service.price)}
                          </span>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        selected
                          ? 'bg-white border-white'
                          : 'border-zinc-300 bg-transparent'
                      }`}>
                        {selected && <Check className="h-3 w-3 text-zinc-900" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky bottom bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-20 transition-transform duration-300 ${hasSelected ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="bg-white border-t border-zinc-100 px-4 py-4 safe-area-bottom">
          <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {booking.selectedServices.length} {booking.selectedServices.length === 1 ? 'service' : 'services'}
              </p>
              <p className="text-xs text-zinc-400">
                {totalDuration} min · {formatCurrency(totalPrice)}
              </p>
            </div>
            <button
              onClick={onNext}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-6 py-3 rounded-full hover:bg-zinc-700 transition-colors"
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
