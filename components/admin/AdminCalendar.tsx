'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, X, Clock, User, CheckCircle, Search } from 'lucide-react'
import { formatCurrency, formatTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const PX_PER_MIN = 1.6
const START_HOUR = 8
const END_HOUR = 21
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * 60 * PX_PER_MIN
const TIME_COL_W = 52
const COL_W = 168

// Cohere-aligned block colors by category slug
const CAT_COLORS: Record<string, { bg: string; bar: string; text: string }> = {
  manicure:  { bg: '#f5f5f4', bar: '#292524', text: '#1c1917' },
  pedicure:  { bg: '#f1f5f9', bar: '#475569', text: '#1e293b' },
  gel:       { bg: '#faf5ff', bar: '#7c3aed', text: '#4c1d95' },
  acrylic:   { bg: '#fff7ed', bar: '#c2410c', text: '#7c2d12' },
  'nail-art':{ bg: '#f0fdf4', bar: '#15803d', text: '#14532d' },
  waxing:    { bg: '#fefce8', bar: '#a16207', text: '#713f12' },
}
const DEFAULT_COLOR = { bg: '#f4f4f5', bar: '#3f3f46', text: '#18181b' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minToTime(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}
function fmtHour(h: number) {
  return h === 12 ? '12p' : h < 12 ? `${h}a` : `${h - 12}p`
}
function offsetY(t: string) {
  return (timeToMin(t) - START_HOUR * 60) * PX_PER_MIN
}
function blockH(s: string, e: string) {
  return Math.max((timeToMin(e) - timeToMin(s)) * PX_PER_MIN, 24)
}
function nowOffsetY() {
  const n = new Date()
  return (n.getHours() * 60 + n.getMinutes() - START_HOUR * 60) * PX_PER_MIN
}
function addDays(d: string, n: number) {
  const dt = new Date(d + 'T00:00:00')
  dt.setDate(dt.getDate() + n)
  return dt.toISOString().split('T')[0]
}
function isToday(d: string) {
  return d === new Date().toISOString().split('T')[0]
}
function catColor(appt: any) {
  const slug = appt.services?.[0]?.service?.category?.slug
    ?? appt.services?.[0]?.service?.category?.name_en?.toLowerCase().replace(/\s+/g, '-')
  return CAT_COLORS[slug ?? ''] ?? DEFAULT_COLOR
}

// ─── Mini month calendar ──────────────────────────────────────────────────────

function MiniCalendar({ selected, onSelect }: { selected: string; onSelect: (d: string) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(selected + 'T00:00:00')
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const today = new Date().toISOString().split('T')[0]
  const firstDay = new Date(cursor.year, cursor.month, 1).getDay()
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  function toDateStr(day: number) {
    return `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const monthLabel = new Date(cursor.year, cursor.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  function prevMonth() {
    setCursor(c => {
      const d = new Date(c.year, c.month - 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }
  function nextMonth() {
    setCursor(c => {
      const d = new Date(c.year, c.month + 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors">
          <ChevronLeft className="h-3.5 w-3.5 text-zinc-500" />
        </button>
        <span className="text-xs font-medium text-zinc-700">{monthLabel}</span>
        <button onClick={nextMonth} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-zinc-100 transition-colors">
          <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={i} className="text-center text-[9px] tracking-wide text-zinc-400 font-medium py-0.5">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds = toDateStr(day)
          const isSel = ds === selected
          const itd = ds === today
          return (
            <button
              key={i}
              onClick={() => onSelect(ds)}
              className={`h-7 w-full rounded-lg text-[11px] font-medium transition-colors ${
                isSel
                  ? 'bg-zinc-900 text-white'
                  : itd
                  ? 'border border-zinc-300 text-zinc-900'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_PILL: Record<string, string> = {
  pending:     'bg-amber-50 text-amber-700 border-amber-200',
  confirmed:   'bg-zinc-100 text-zinc-700 border-zinc-200',
  in_progress: 'bg-zinc-900 text-white border-zinc-900',
  completed:   'bg-zinc-50 text-zinc-400 border-zinc-100',
}

// ─── Appointment Detail Panel ─────────────────────────────────────────────────

function ApptDetail({ appt, onClose, onStatusChange }: {
  appt: any
  onClose: () => void
  onStatusChange: (id: string, status: string) => void
}) {
  const col = catColor(appt)
  const client = appt.client
  const staffName = appt.staff?.profile?.full_name ?? '—'
  const services = appt.services?.map((as: any) => as.service?.name_en).filter(Boolean) as string[]

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-end p-4 pt-20" onClick={onClose}>
      <div className="bg-white rounded-[22px] shadow-2xl w-80 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Colored top bar */}
        <div className="h-1" style={{ background: col.bar }} />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-medium text-zinc-900 text-base">{client?.full_name ?? '—'}</p>
              {client?.phone && <p className="text-xs text-zinc-400 mt-0.5">{client.phone}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] tracking-[0.1em] uppercase font-medium px-2.5 py-1 rounded-full border ${STATUS_PILL[appt.status] ?? STATUS_PILL.pending}`}>
                {appt.status.replace('_', ' ')}
              </span>
              <button onClick={onClose} className="w-6 h-6 flex items-center justify-center hover:bg-zinc-100 rounded-lg transition-colors">
                <X className="h-3.5 w-3.5 text-zinc-400" />
              </button>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2.5 text-sm text-zinc-600">
              <Clock className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
              {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
            </div>
            <div className="flex items-center gap-2.5 text-sm text-zinc-600">
              <User className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
              {staffName}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-4">
            {services?.map((s, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full" style={{ background: col.bg, color: col.text }}>
                {s}
              </span>
            ))}
          </div>

          <p className="text-sm font-semibold text-zinc-900 mb-4">{formatCurrency(appt.total_amount)}</p>

          {appt.notes && (
            <p className="text-xs text-zinc-500 bg-zinc-50 border border-zinc-100 px-3 py-2 rounded-xl mb-4 italic">
              "{appt.notes}"
            </p>
          )}

          <div className="flex gap-2">
            {appt.status === 'pending' && (
              <button
                onClick={() => { onStatusChange(appt.id, 'confirmed'); onClose() }}
                className="flex-1 py-2.5 text-xs tracking-widest uppercase border border-zinc-200 rounded-full hover:border-zinc-900 text-zinc-600 hover:text-zinc-900 transition-colors"
              >
                Confirm
              </button>
            )}
            {appt.status === 'confirmed' && (
              <button
                onClick={() => { onStatusChange(appt.id, 'in_progress'); onClose() }}
                className="flex-1 py-2.5 text-xs tracking-widest uppercase bg-zinc-900 text-white rounded-full hover:bg-zinc-700 transition-colors"
              >
                Start
              </button>
            )}
            {appt.status === 'in_progress' && (
              <button
                onClick={() => { onStatusChange(appt.id, 'completed'); onClose() }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 text-xs tracking-widest uppercase bg-zinc-900 text-white rounded-full hover:bg-zinc-700 transition-colors"
              >
                <CheckCircle className="h-3 w-3" /> Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── New Appointment Modal ────────────────────────────────────────────────────

function NewApptModal({ staffList, services, date, prefTime, prefStaffId, onClose, onCreated }: {
  staffList: any[]
  services: Service[]
  date: string
  prefTime: string
  prefStaffId: string
  onClose: () => void
  onCreated: (appt: any) => void
}) {
  const [phone, setPhone] = useState('')
  const [foundClient, setFoundClient] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [startTime, setStartTime] = useState(prefTime)
  const [staffId, setStaffId] = useState(prefStaffId)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const categories = Array.from(new Set(services.map(s => s.category?.id)))
    .map(id => services.find(s => s.category?.id === id)?.category)
    .filter(Boolean)

  async function searchClient() {
    if (!phone) return
    setSearching(true); setFoundClient(null)
    const res = await fetch(`/api/staff/client-search?phone=${encodeURIComponent(phone)}`)
    const data = await res.json()
    setSearching(false)
    setFoundClient(data.client ?? null)
  }

  function toggleSvc(id: string) {
    setSelectedServices(p => p.includes(id) ? p.filter(s => s !== id) : [...p, id])
  }

  async function create() {
    if (!foundClient || selectedServices.length === 0) return
    setLoading(true); setError('')
    const res = await fetch('/api/staff/walkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: foundClient.id, serviceIds: selectedServices, staffId, date, startTime, notes }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    onCreated(data); onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-end p-4 pt-20">
      <div className="bg-white rounded-[22px] shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-0.5">New</p>
            <h3 className="text-base font-light text-zinc-900" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
              Appointment
            </h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors">
            <X className="h-4 w-4 text-zinc-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Client search */}
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">Client Phone</label>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchClient()}
                placeholder="Search by phone…"
                className="flex-1 h-10 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
              />
              <button
                onClick={searchClient}
                disabled={!phone || searching}
                className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase border border-zinc-200 px-4 py-2 rounded-full hover:border-zinc-900 transition-colors disabled:opacity-40"
              >
                <Search className="h-3 w-3" />
                {searching ? '…' : 'Find'}
              </button>
            </div>
            {foundClient && (
              <p className="mt-2 text-xs text-zinc-700 bg-zinc-50 border border-zinc-100 px-3 py-2 rounded-xl">
                ✓ {foundClient.full_name}
              </p>
            )}
            {!foundClient && phone && !searching && (
              <p className="mt-1.5 text-xs text-zinc-400">No client found — must be registered first</p>
            )}
          </div>

          {/* Services */}
          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">Services</label>
            <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {categories.map(cat => (
                <div key={cat!.id}>
                  <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-400 mb-1.5">{cat!.name_en}</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {services.filter(s => s.category_id === cat!.id).map(svc => (
                      <button
                        key={svc.id}
                        onClick={() => toggleSvc(svc.id)}
                        className={`text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                          selectedServices.includes(svc.id)
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
                        }`}
                      >
                        <p className="font-medium truncate">{svc.name_en}</p>
                        <p className={`mt-0.5 ${selectedServices.includes(svc.id) ? 'text-zinc-400' : 'text-zinc-400'}`}>
                          {svc.duration_minutes}m · {formatCurrency(svc.price)}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Time + Staff */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
              />
            </div>
            <div>
              <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">Staff</label>
              <select
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-sm bg-white outline-none focus:border-zinc-900"
              >
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.profile?.full_name ?? 'Staff'}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">Notes</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional…"
              className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 px-3 py-2 rounded-xl">{error}</p>
          )}

          <button
            onClick={create}
            disabled={!foundClient || selectedServices.length === 0 || loading}
            className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium py-3.5 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            {loading ? 'Creating…' : 'Create Appointment'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Calendar ────────────────────────────────────────────────────────────

interface Props {
  appointments: any[]
  staffList: any[]
  services: Service[]
  selectedDate: string
  locale: string
}

export default function AdminCalendar({ appointments: initial, staffList, services, selectedDate, locale }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const today = isToday(selectedDate)

  const [appointments, setAppointments] = useState(initial)
  const [selectedAppt, setSelectedAppt] = useState<any>(null)
  const [newModal, setNewModal] = useState<{ time: string; staffId: string } | null>(null)
  const [nowY, setNowY] = useState(nowOffsetY())

  // Tick current-time line every minute
  useEffect(() => {
    const id = setInterval(() => setNowY(nowOffsetY()), 60000)
    return () => clearInterval(id)
  }, [])

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (today && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, nowY - 120)
    } else if (scrollRef.current) {
      scrollRef.current.scrollTop = (9 - START_HOUR) * 60 * PX_PER_MIN
    }
  }, [])

  const byStaff = staffList.reduce<Record<string, any[]>>((acc, s) => {
    acc[s.id] = appointments.filter(a => a.staff_id === s.id)
    return acc
  }, {})

  async function updateStatus(id: string, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, staffId: string) {
    if ((e.target as HTMLElement).closest('[data-appt]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0)
    const totalMins = START_HOUR * 60 + Math.floor(y / PX_PER_MIN)
    const snapped = Math.round(totalMins / 15) * 15
    setNewModal({ time: minToTime(snapped), staffId })
  }

  function navigate(delta: number) {
    router.push(`/${locale}/admin/calendar?date=${addDays(selectedDate, delta)}`)
  }

  function goToDate(d: string) {
    router.push(`/${locale}/admin/calendar?date=${d}`)
  }

  const totalAppts = appointments.length
  const dateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const dateShort = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-stone-50">

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-xl hover:border-zinc-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-zinc-600" />
          </button>
          <button
            onClick={() => router.push(`/${locale}/admin/calendar`)}
            className={`px-3 py-1.5 text-xs tracking-widest uppercase rounded-full border transition-colors ${
              today ? 'bg-zinc-900 text-white border-zinc-900' : 'border-zinc-200 text-zinc-500 hover:border-zinc-900 hover:text-zinc-900'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => navigate(1)}
            className="w-8 h-8 flex items-center justify-center border border-zinc-200 rounded-xl hover:border-zinc-900 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-zinc-600" />
          </button>
          <span className="ml-2 text-sm font-medium text-zinc-900 hidden sm:block">{dateLabel}</span>
          <span className="ml-2 text-sm font-medium text-zinc-900 sm:hidden">{dateShort}</span>
          {totalAppts > 0 && (
            <span className="ml-1 text-[10px] tracking-wide text-zinc-400">{totalAppts} appt{totalAppts !== 1 ? 's' : ''}</span>
          )}
        </div>

        <button
          onClick={() => setNewModal({ time: '09:00', staffId: staffList[0]?.id ?? '' })}
          className="inline-flex items-center gap-1.5 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-4 py-2 rounded-full hover:bg-zinc-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {/* ── Body: sidebar + grid ────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — mini calendar */}
        <div className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-white border-r border-zinc-100 p-5 gap-6">
          <MiniCalendar selected={selectedDate} onSelect={goToDate} />

          {/* Staff legend */}
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">Staff Today</p>
            <div className="space-y-2">
              {staffList.map(s => {
                const count = byStaff[s.id]?.length ?? 0
                return (
                  <div key={s.id} className="flex items-center gap-2.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: s.color ?? '#3f3f46' }}
                    />
                    <span className="text-xs text-zinc-600 flex-1 truncate">{s.profile?.full_name}</span>
                    <span className="text-xs text-zinc-400">{count}</span>
                  </div>
                )
              })}
              {staffList.length === 0 && <p className="text-xs text-zinc-300">No active staff</p>}
            </div>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* Staff column headers */}
          <div
            className="bg-white border-b border-zinc-100 flex flex-shrink-0 overflow-x-auto"
            style={{ paddingLeft: TIME_COL_W }}
          >
            {staffList.map(staff => (
              <div
                key={staff.id}
                className="flex-shrink-0 flex items-center gap-2.5 px-4 py-3 border-l border-zinc-100"
                style={{ width: COL_W }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                  style={{ background: staff.color ?? '#3f3f46' }}
                >
                  {staff.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-zinc-900 truncate">{staff.profile?.full_name}</p>
                  <p className="text-[10px] text-zinc-400">{byStaff[staff.id]?.length ?? 0} appt{byStaff[staff.id]?.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
            {staffList.length === 0 && (
              <div className="px-4 py-3 text-xs text-zinc-400">No staff assigned</div>
            )}
          </div>

          {/* Scrollable time grid */}
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div className="flex" style={{ minWidth: TIME_COL_W + staffList.length * COL_W, height: TOTAL_HEIGHT }}>

              {/* Time labels */}
              <div
                className="flex-shrink-0 bg-white border-r border-zinc-100 relative"
                style={{ width: TIME_COL_W, height: TOTAL_HEIGHT }}
              >
                {HOURS.map(h => (
                  <div
                    key={h}
                    className="absolute w-full flex items-center justify-end pr-2.5"
                    style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN - 8 }}
                  >
                    <span className="text-[10px] text-zinc-400">{fmtHour(h)}</span>
                  </div>
                ))}
              </div>

              {/* Staff columns */}
              {staffList.map(staff => {
                const appts = byStaff[staff.id] ?? []
                return (
                  <div
                    key={staff.id}
                    className="flex-shrink-0 border-l border-zinc-100 relative cursor-crosshair"
                    style={{ width: COL_W, height: TOTAL_HEIGHT }}
                    onClick={e => handleColumnClick(e, staff.id)}
                  >
                    {/* Hour lines */}
                    {HOURS.map(h => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-zinc-100"
                        style={{ top: (h - START_HOUR) * 60 * PX_PER_MIN }}
                      />
                    ))}
                    {/* Half-hour lines */}
                    {HOURS.map(h => (
                      <div
                        key={`${h}h`}
                        className="absolute left-0 right-0 border-t border-dashed border-zinc-50"
                        style={{ top: (h - START_HOUR + 0.5) * 60 * PX_PER_MIN }}
                      />
                    ))}

                    {/* Current time indicator */}
                    {today && nowY >= 0 && nowY <= TOTAL_HEIGHT && (
                      <div
                        className="absolute left-0 right-0 z-20 pointer-events-none"
                        style={{ top: nowY }}
                      >
                        <div className="h-px bg-zinc-900 relative">
                          <div className="absolute -left-1 -top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-900" />
                        </div>
                      </div>
                    )}

                    {/* Appointment blocks */}
                    {appts.map(appt => {
                      const top = offsetY(appt.start_time)
                      const height = blockH(appt.start_time, appt.end_time)
                      if (top < 0 || top > TOTAL_HEIGHT) return null
                      const col = catColor(appt)
                      const clientName = appt.client?.full_name ?? '—'
                      const svcNames = appt.services?.map((as: any) => as.service?.name_en).filter(Boolean).join(', ')

                      return (
                        <div
                          key={appt.id}
                          data-appt
                          className="absolute left-1.5 right-1.5 rounded-xl px-2.5 py-1.5 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden z-10 border-l-2 shadow-sm"
                          style={{ top, height, background: col.bg, borderLeftColor: col.bar, color: col.text }}
                          onClick={e => { e.stopPropagation(); setSelectedAppt(appt) }}
                        >
                          <p className="text-[11px] font-semibold truncate leading-tight">{clientName}</p>
                          {height > 32 && (
                            <p className="text-[10px] truncate opacity-70 leading-tight mt-0.5">{svcNames}</p>
                          )}
                          {height > 52 && (
                            <p className="text-[10px] opacity-50 leading-tight mt-0.5">{formatTime(appt.start_time)}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedAppt && (
        <ApptDetail
          appt={selectedAppt}
          onClose={() => setSelectedAppt(null)}
          onStatusChange={updateStatus}
        />
      )}
      {newModal && (
        <NewApptModal
          staffList={staffList}
          services={services}
          date={selectedDate}
          prefTime={newModal.time}
          prefStaffId={newModal.staffId}
          onClose={() => setNewModal(null)}
          onCreated={appt => setAppointments(prev => [...prev, appt])}
        />
      )}
    </div>
  )
}
