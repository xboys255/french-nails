'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, User, CheckCircle, X } from 'lucide-react'
import { formatTime, formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ─── Constants ───────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8) // 8 am – 7 pm
const PX_PER_MIN = 1.6
const HOUR_H = PX_PER_MIN * 60

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  pending:     { bg: 'bg-amber-50',  border: 'border-amber-200', text: 'text-amber-700' },
  confirmed:   { bg: 'bg-zinc-100',  border: 'border-zinc-200',  text: 'text-zinc-700'  },
  in_progress: { bg: 'bg-zinc-900',  border: 'border-zinc-900',  text: 'text-white'     },
  completed:   { bg: 'bg-zinc-50',   border: 'border-zinc-100',  text: 'text-zinc-400'  },
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Appt {
  id: string
  date: string
  start_time: string
  end_time: string
  status: string
  total_amount: number
  notes?: string
  client: { full_name: string; phone?: string }
  services: { service: { name_en: string } }[]
}

// ─── Mini Calendar ───────────────────────────────────────────────────────────

function MiniCalendar({
  selected,
  onSelect,
  apptDates,
}: {
  selected: string
  onSelect: (d: string) => void
  apptDates: Set<string>
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date(selected + 'T00:00:00')
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const today = new Date().toISOString().split('T')[0]
  const year = month.getFullYear()
  const mon = month.getMonth()
  const firstDay = new Date(year, mon, 1).getDay()
  const daysInMonth = new Date(year, mon + 1, 0).getDate()
  const monthLabel = month.toLocaleString('default', { month: 'long', year: 'numeric' })

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonth(new Date(year, mon - 1, 1))}
          className="p-1 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5 text-zinc-500" />
        </button>
        <span className="text-xs font-medium text-zinc-700">{monthLabel}</span>
        <button
          onClick={() => setMonth(new Date(year, mon + 1, 1))}
          className="p-1 rounded-lg hover:bg-zinc-100 transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] tracking-widest uppercase text-zinc-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1
          const dateStr = `${year}-${String(mon + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
          const isSelected = dateStr === selected
          const isToday = dateStr === today
          const hasAppts = apptDates.has(dateStr)

          return (
            <button
              key={d}
              onClick={() => onSelect(dateStr)}
              className={`relative h-7 w-full flex items-center justify-center rounded-lg text-xs transition-colors ${
                isSelected
                  ? 'bg-zinc-900 text-white'
                  : isToday
                  ? 'border border-zinc-900 text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {d}
              {hasAppts && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zinc-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface Props {
  appointments: Appt[]
  staffId: string
}

export default function StaffCalendar({ appointments, staffId }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const supabase = createClient()

  const [selectedDate, setSelectedDate] = useState(today)
  const [localAppts, setLocalAppts] = useState<Appt[]>(appointments)
  const [selectedAppt, setSelectedAppt] = useState<Appt | null>(null)
  const [nowY, setNowY] = useState<number | null>(null)
  const timeGridRef = useRef<HTMLDivElement>(null)

  const dayAppts = localAppts.filter(a => a.date === selectedDate)
  const apptDates = new Set(localAppts.map(a => a.date))

  // Now-indicator update
  useEffect(() => {
    function tick() {
      if (selectedDate !== today) { setNowY(null); return }
      const now = new Date()
      const mins = (now.getHours() - 8) * 60 + now.getMinutes()
      setNowY(mins >= 0 && mins <= HOURS.length * 60 ? mins * PX_PER_MIN : null)
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [selectedDate, today])

  // Auto-scroll to current time (or 9 am on other days)
  useEffect(() => {
    if (!timeGridRef.current) return
    const isToday = selectedDate === today
    const now = new Date()
    const targetMins = isToday
      ? (now.getHours() - 8) * 60 + now.getMinutes()
      : 60 // 9 am
    timeGridRef.current.scrollTop = Math.max(0, targetMins * PX_PER_MIN - 80)
  }, [selectedDate])

  function minutesFrom8(t: string) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m - 8 * 60
  }

  function apptStyle(appt: Appt) {
    const start = minutesFrom8(appt.start_time)
    const end = minutesFrom8(appt.end_time)
    const top = start * PX_PER_MIN
    const height = Math.max((end - start) * PX_PER_MIN, 36)
    return { top, height }
  }

  async function changeStatus(id: string, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    setLocalAppts(prev => prev.map(a => a.id === id ? { ...a, status } : a))
    setSelectedAppt(prev => prev?.id === id ? { ...prev, status } : prev)
  }

  function shiftDay(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDate(d.toISOString().split('T')[0])
    setSelectedAppt(null)
  }

  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Left sidebar ── */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 border-r border-zinc-200 bg-white p-5 gap-6 overflow-y-auto">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">My Schedule</p>
          <button
            onClick={() => { setSelectedDate(today); setSelectedAppt(null) }}
            className="w-full py-2 text-xs tracking-widest uppercase border border-zinc-200 rounded-full text-zinc-500 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
          >
            Today
          </button>
        </div>

        <MiniCalendar
          selected={selectedDate}
          onSelect={d => { setSelectedDate(d); setSelectedAppt(null) }}
          apptDates={apptDates}
        />

        <div className="border-t border-zinc-100 pt-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2">This day</p>
          <p
            className="text-3xl font-light text-zinc-900"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            {dayAppts.length}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            appointment{dayAppts.length !== 1 ? 's' : ''}
          </p>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-stone-50">

        {/* Day navigation header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => shiftDay(-1)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-zinc-500" />
            </button>
            <div>
              <p className="text-sm font-medium text-zinc-900">{dateLabel}</p>
              <p className="text-xs text-zinc-400">
                {dayAppts.length} appointment{dayAppts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => shiftDay(1)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </button>
          </div>

          {/* Mobile: today button */}
          <button
            onClick={() => { setSelectedDate(today); setSelectedAppt(null) }}
            className="lg:hidden text-xs tracking-widest uppercase border border-zinc-200 px-4 py-2 rounded-full hover:border-zinc-900 text-zinc-500 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Time grid */}
        <div ref={timeGridRef} className="flex-1 overflow-y-auto">
          <div
            className="relative"
            style={{ height: HOURS.length * HOUR_H + 40 }}
          >
            {/* Hour rows */}
            {HOURS.map((hour, i) => (
              <div
                key={hour}
                className="absolute left-0 right-0 flex"
                style={{ top: i * HOUR_H }}
              >
                <div className="w-14 flex-shrink-0 pr-3 text-right pt-0">
                  <span className="text-[10px] text-zinc-400 -translate-y-2.5 inline-block">
                    {hour === 12 ? '12 pm' : hour > 12 ? `${hour - 12} pm` : `${hour} am`}
                  </span>
                </div>
                <div className="flex-1 border-t border-zinc-200" />
              </div>
            ))}

            {/* 30-min dashed lines */}
            {HOURS.map((_, i) => (
              <div
                key={`half-${i}`}
                className="absolute left-14 right-0 border-t border-dashed border-zinc-100"
                style={{ top: i * HOUR_H + HOUR_H / 2 }}
              />
            ))}

            {/* Now indicator */}
            {nowY !== null && (
              <div
                className="absolute left-14 right-0 flex items-center pointer-events-none z-10"
                style={{ top: nowY }}
              >
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                <div className="flex-1 h-px bg-red-400" />
              </div>
            )}

            {/* Appointment blocks */}
            <div className="absolute left-14 right-3 top-0">
              {dayAppts.map(appt => {
                const { top, height } = apptStyle(appt)
                const s = STATUS_STYLES[appt.status] ?? STATUS_STYLES.pending
                const services = appt.services?.map(as => as.service?.name_en).filter(Boolean) ?? []

                return (
                  <button
                    key={appt.id}
                    onClick={() => setSelectedAppt(appt)}
                    className={`absolute left-0 right-0 rounded-xl border-l-4 ${s.border} ${s.bg} px-3 py-2 text-left hover:shadow-md transition-all overflow-hidden`}
                    style={{ top: top + 1, height: height - 2 }}
                  >
                    <p className={`text-xs font-semibold truncate ${s.text}`}>
                      {appt.client?.full_name ?? '—'}
                    </p>
                    {height > 44 && (
                      <p className={`text-[10px] truncate mt-0.5 ${s.text} opacity-75`}>
                        {services.join(' · ')}
                      </p>
                    )}
                    {height > 60 && (
                      <p className={`text-[10px] mt-1 ${s.text} opacity-60`}>
                        {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Empty state */}
            {dayAppts.length === 0 && (
              <div className="absolute inset-0 left-14 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-sm text-zinc-400">No appointments scheduled</p>
                  <p className="text-xs text-zinc-300 mt-1">Free day — enjoy!</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Appointment detail flyout ── */}
      {selectedAppt && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedAppt(null)}
        >
          <div
            className="bg-white rounded-[22px] shadow-2xl max-w-sm w-full p-7"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">
                  {new Date(selectedAppt.date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })}
                </p>
                <h3
                  className="text-2xl font-light text-zinc-900"
                  style={{ fontFamily: 'var(--font-cormorant), serif' }}
                >
                  {selectedAppt.client?.full_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAppt(null)}
                className="text-zinc-400 hover:text-zinc-900 transition-colors mt-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Meta */}
            <div className="space-y-2 mb-5">
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                <Clock className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                {formatTime(selectedAppt.start_time)} – {formatTime(selectedAppt.end_time)}
              </div>
              {selectedAppt.client?.phone && (
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <User className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                  {selectedAppt.client.phone}
                </div>
              )}
            </div>

            {/* Services */}
            <div className="flex flex-wrap gap-1.5 mb-5">
              {selectedAppt.services?.map((as, i) => (
                <span key={i} className="text-xs bg-zinc-100 text-zinc-600 rounded-full px-2.5 py-1">
                  {as.service?.name_en}
                </span>
              ))}
            </div>

            {/* Notes */}
            {selectedAppt.notes && (
              <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 rounded-xl px-3 py-2.5 mb-5 leading-relaxed">
                {selectedAppt.notes}
              </p>
            )}

            {/* Total */}
            <div className="flex justify-between items-center py-3 border-t border-zinc-100 mb-5">
              <span className="text-xs tracking-widest uppercase text-zinc-400">Total</span>
              <span className="text-base font-semibold text-zinc-900">
                {formatCurrency(selectedAppt.total_amount)}
              </span>
            </div>

            {/* Status actions */}
            <div className="space-y-2">
              {selectedAppt.status === 'pending' && (
                <button
                  onClick={() => changeStatus(selectedAppt.id, 'confirmed')}
                  className="w-full py-3 text-xs tracking-widest uppercase border border-zinc-200 rounded-full text-zinc-700 hover:border-zinc-900 hover:text-zinc-900 transition-colors"
                >
                  Confirm Appointment
                </button>
              )}
              {selectedAppt.status === 'confirmed' && (
                <button
                  onClick={() => changeStatus(selectedAppt.id, 'in_progress')}
                  className="w-full py-3 text-xs tracking-widest uppercase bg-zinc-900 text-white rounded-full hover:bg-zinc-700 transition-colors"
                >
                  Start Session
                </button>
              )}
              {selectedAppt.status === 'in_progress' && (
                <button
                  onClick={() => changeStatus(selectedAppt.id, 'completed')}
                  className="w-full flex items-center justify-center gap-2 py-3 text-xs tracking-widest uppercase bg-zinc-900 text-white rounded-full hover:bg-zinc-700 transition-colors"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Mark Complete
                </button>
              )}
              {selectedAppt.status === 'completed' && (
                <div className="w-full py-3 text-xs tracking-widest uppercase text-center text-zinc-400 border border-zinc-100 rounded-full">
                  Completed
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
