'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Calendar, Clock, User, ArrowRight, ChevronLeft, X } from 'lucide-react'
import { formatDate, formatTime, formatCurrency, CANCELLATION_HOURS } from '@/lib/utils'
import type { Appointment } from '@/types'

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  in_progress: 'bg-zinc-900 text-white border-zinc-900',
  completed: 'bg-zinc-50 text-zinc-400 border-zinc-200',
  cancelled: 'bg-red-50 text-red-400 border-red-100',
  no_show: 'bg-red-50 text-red-400 border-red-100',
}

interface SlotData { time: string; available: boolean }

interface CardProps {
  appt: Appointment
  onReschedule: (appt: Appointment) => void
  onCancel: (id: string) => void
  showCancel: boolean
  showReschedule: boolean
  cancelLabel: string
  statusLabel: string
}

// Module-scope component — avoids remount on every parent re-render
function AppointmentCard({ appt, onReschedule, onCancel, showCancel, showReschedule, cancelLabel, statusLabel }: CardProps) {
  const services = appt.services?.map((as: any) => as.service?.name_en).filter(Boolean) as string[]

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-900">{formatDate(appt.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Clock className="h-3 w-3 text-zinc-400" />
            {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
          </div>
        </div>
        <span className={`text-[10px] tracking-[0.1em] uppercase font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[appt.status] ?? STATUS_STYLES.pending}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-600 mb-3">
        <User className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
        <span>{(appt.staff as any)?.profile?.full_name ?? '—'}</span>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {services?.map((s, i) => (
          <span key={i} className="text-xs bg-zinc-100 text-zinc-600 rounded-full px-2.5 py-1">{s}</span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900">{formatCurrency(appt.total_amount)}</span>
        <div className="flex gap-2">
          {showReschedule && (
            <button
              onClick={() => onReschedule(appt)}
              className="text-xs tracking-widest uppercase border border-zinc-200 px-3 py-1.5 rounded-full hover:border-zinc-900 hover:text-zinc-900 text-zinc-500 transition-colors"
            >
              Reschedule
            </button>
          )}
          {showCancel && (
            <button
              onClick={() => onCancel(appt.id)}
              className="text-xs tracking-widest uppercase border border-zinc-200 px-3 py-1.5 rounded-full hover:border-red-300 hover:text-red-600 text-zinc-400 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  appointments: Appointment[]
  locale: string
}

export default function ClientAppointments({ appointments, locale }: Props) {
  const t = useTranslations('appointments')
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelError, setCancelError] = useState('')
  const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(false)
  const [localAppts, setLocalAppts] = useState(appointments)

  // Reschedule state
  const [newDate, setNewDate] = useState('')
  const [slots, setSlots] = useState<SlotData[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState('')
  const [rescheduleMsg, setRescheduleMsg] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const upcoming = localAppts.filter(a => a.date >= today && !['cancelled', 'completed', 'no_show'].includes(a.status))
  const past = localAppts.filter(a => a.date < today || ['completed', 'no_show'].includes(a.status))
  const cancelled = localAppts.filter(a => a.status === 'cancelled')

  function canCancel(appt: Appointment) {
    if (!['pending', 'confirmed'].includes(appt.status)) return false
    const dt = new Date(`${appt.date}T${appt.start_time}`)
    return (dt.getTime() - Date.now()) / 3600000 >= CANCELLATION_HOURS
  }

  function canReschedule(appt: Appointment) {
    if (!['pending', 'confirmed'].includes(appt.status)) return false
    const dt = new Date(`${appt.date}T${appt.start_time}`)
    return (dt.getTime() - Date.now()) / 3600000 >= CANCELLATION_HOURS
  }

  async function handleCancel(id: string) {
    setCancelError('')
    setLoading(true)
    const res = await fetch('/api/booking/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: id }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok || data.error) {
      setCancelError(data.error ?? 'Failed to cancel appointment. Please try again.')
      return
    }
    setLocalAppts(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' as const } : a))
    setCancelId(null)
  }

  async function loadSlots(date: string, appt: Appointment) {
    setSelectedTime('')
    setRescheduleMsg('')
    if (!date) { setSlots([]); return }
    setSlotsLoading(true)
    const totalDuration = appt.services?.reduce((a, s: any) => a + (s.service?.duration_minutes ?? 0), 0) ?? 60
    const params = new URLSearchParams({
      date,
      duration: String(totalDuration),
      staffId: (appt.staff as any)?.id ?? '',
    })
    const res = await fetch(`/api/availability?${params}`)
    const data = await res.json()
    setSlots(data.slots ?? [])
    setSlotsLoading(false)
  }

  async function handleReschedule() {
    if (!rescheduleAppt || !newDate || !selectedTime) return
    setLoading(true)
    setRescheduleMsg('')
    const res = await fetch('/api/booking/reschedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appointmentId: rescheduleAppt.id, newDate, newStartTime: selectedTime }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setRescheduleMsg(data.error); return }
    setLocalAppts(prev => prev.map(a =>
      a.id === rescheduleAppt.id
        ? { ...a, date: newDate, start_time: selectedTime, end_time: data.newEndTime, status: 'confirmed' as const }
        : a
    ))
    setRescheduleAppt(null)
    setNewDate('')
    setSlots([])
    setSelectedTime('')
  }

  function openReschedule(appt: Appointment) {
    setRescheduleAppt(appt)
    setNewDate('')
    setSlots([])
    setSelectedTime('')
    setRescheduleMsg('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">My Account</p>
          <h1
            className="text-2xl font-light text-zinc-900 tracking-tight"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            {t('title')}
          </h1>
        </div>
        <Link
          href={`/${locale}/book`}
          className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-5 py-2.5 rounded-full hover:bg-zinc-700 transition-colors"
        >
          {t('bookNow')} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Cancel dialog */}
      {cancelId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[22px] shadow-2xl max-w-sm w-full p-7">
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-2">Confirm</p>
            <h3
              className="text-xl font-light text-zinc-900 mb-3"
              style={{ fontFamily: 'var(--font-cormorant), serif' }}
            >
              Cancel appointment?
            </h3>
            <p className="text-sm text-zinc-500 mb-4">{t('cancelPolicy')}</p>
            {cancelError && (
              <p className="text-sm text-red-500 mb-4 bg-red-50 rounded-xl px-3 py-2">{cancelError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelId(null); setCancelError('') }}
                className="flex-1 py-3 text-xs tracking-widest uppercase border border-zinc-200 rounded-full text-zinc-600 hover:border-zinc-900 transition-colors"
              >
                {t('keepAppointment')}
              </button>
              <button
                onClick={() => handleCancel(cancelId)}
                disabled={loading}
                className="flex-1 py-3 text-xs tracking-widest uppercase bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-40"
              >
                {loading ? 'Cancelling...' : t('confirmCancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule modal */}
      {rescheduleAppt && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[22px] shadow-2xl max-w-sm w-full p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Reschedule</p>
                <h3
                  className="text-xl font-light text-zinc-900"
                  style={{ fontFamily: 'var(--font-cormorant), serif' }}
                >
                  Pick a new time
                </h3>
              </div>
              <button onClick={() => setRescheduleAppt(null)} className="text-zinc-400 hover:text-zinc-900 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-500 mb-5">
              Current: {formatDate(rescheduleAppt.date)} at {formatTime(rescheduleAppt.start_time)}
            </p>

            <div className="mb-4">
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">New Date</label>
              <input
                type="date"
                min={today}
                value={newDate}
                onChange={e => {
                  setNewDate(e.target.value)
                  loadSlots(e.target.value, rescheduleAppt)
                }}
                className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
              />
            </div>

            {newDate && (
              <div className="mb-5">
                <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">New Time</label>
                {slotsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="h-10 rounded-xl bg-zinc-100 animate-pulse" />
                    ))}
                  </div>
                ) : slots.filter(s => s.available).length === 0 ? (
                  <p className="text-sm text-zinc-400">No available slots on this date.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    {slots.filter(s => s.available).map(slot => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                          selectedTime === slot.time
                            ? 'bg-zinc-900 border-zinc-900 text-white'
                            : 'border-zinc-200 text-zinc-700 hover:border-zinc-900'
                        }`}
                      >
                        {formatTime(slot.time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {rescheduleMsg && (
              <p className="text-sm text-red-500 mb-4">{rescheduleMsg}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setRescheduleAppt(null)}
                className="flex-1 py-3 text-xs tracking-widest uppercase border border-zinc-200 rounded-full text-zinc-500 hover:border-zinc-900 transition-colors"
              >
                <ChevronLeft className="h-3 w-3 inline mr-1" /> Back
              </button>
              <button
                onClick={handleReschedule}
                disabled={!selectedTime || loading}
                className="flex-1 py-3 text-xs tracking-widest uppercase bg-zinc-900 text-white rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-40"
              >
                {loading ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming */}
      <section className="mb-8">
        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">{t('upcoming')}</p>
        {upcoming.length === 0 ? (
          <div className="border border-zinc-100 rounded-2xl p-8 text-center">
            <p className="text-sm text-zinc-400 mb-3">{t('noUpcoming')}</p>
            <Link
              href={`/${locale}/book`}
              className="text-xs tracking-widest uppercase text-zinc-900 underline underline-offset-4"
            >
              Book now
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(a => (
              <AppointmentCard
                key={a.id}
                appt={a}
                onReschedule={openReschedule}
                onCancel={setCancelId}
                showCancel={canCancel(a)}
                showReschedule={canReschedule(a)}
                cancelLabel={t('cancel')}
                statusLabel={t(`status.${a.status}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section className="mb-8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">{t('past')}</p>
          <div className="space-y-3">
            {past.map(a => (
              <AppointmentCard
                key={a.id}
                appt={a}
                onReschedule={openReschedule}
                onCancel={setCancelId}
                showCancel={canCancel(a)}
                showReschedule={canReschedule(a)}
                cancelLabel={t('cancel')}
                statusLabel={t(`status.${a.status}`)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Cancelled */}
      {cancelled.length > 0 && (
        <section>
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">{t('cancelled')}</p>
          <div className="space-y-3">
            {cancelled.map(a => (
              <AppointmentCard
                key={a.id}
                appt={a}
                onReschedule={openReschedule}
                onCancel={setCancelId}
                showCancel={canCancel(a)}
                showReschedule={canReschedule(a)}
                cancelLabel={t('cancel')}
                statusLabel={t(`status.${a.status}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
