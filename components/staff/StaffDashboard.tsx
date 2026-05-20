'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Calendar, Clock, User, CheckCircle, TrendingUp, DollarSign,
  Plus, Search, ChevronDown, ChevronUp, Save, PenLine,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { formatTime, formatDate, formatCurrency } from '@/lib/utils'
import type { Appointment, Staff, Profile, Service } from '@/types'
import { createClient } from '@/lib/supabase/client'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TABS = ['Today', 'Upcoming', 'Walk-in', 'Availability', 'Earnings'] as const
type Tab = typeof TABS[number]

interface Earnings {
  weekRevenue: number
  monthRevenue: number
  weekBookings: number
  monthBookings: number
}

interface Props {
  staff: Staff | null
  profile: Profile | null
  todayAppts: Appointment[]
  upcomingAppts: Appointment[]
  earnings: Earnings
  services: Service[]
  allStaff: any[]
  locale: string
}

// ─── Status badge ────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  in_progress: 'bg-zinc-900 text-white border-zinc-900',
  completed: 'bg-zinc-50 text-zinc-400 border-zinc-200',
}

// ─── Appointment Card ────────────────────────────────────────────────────────

function ApptCard({
  appt,
  showDate = false,
  onStatusChange,
}: {
  appt: any
  showDate?: boolean
  onStatusChange: (id: string, status: string) => void
}) {
  const supabase = createClient()
  const [notesOpen, setNotesOpen] = useState(false)
  const [notes, setNotes] = useState(appt.notes ?? '')
  const [saving, setSaving] = useState(false)

  const client = appt.client
  const services = appt.services?.map((as: any) => as.service?.name_en).filter(Boolean) as string[]

  async function saveNotes() {
    setSaving(true)
    await supabase.from('appointments').update({ notes }).eq('id', appt.id)
    setSaving(false)
    setNotesOpen(false)
  }

  return (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          {showDate && (
            <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-400 mb-1">{formatDate(appt.date)}</p>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-900">
              {formatTime(appt.start_time)} – {formatTime(appt.end_time)}
            </span>
          </div>
        </div>
        <span className={`text-[10px] tracking-[0.1em] uppercase font-medium px-2.5 py-1 rounded-full border ${STATUS_STYLES[appt.status] ?? STATUS_STYLES.pending}`}>
          {appt.status.replace('_', ' ')}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-zinc-700 mb-3">
        <User className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
        <span className="font-medium">{client?.full_name ?? '—'}</span>
        {client?.phone && <span className="text-zinc-400 text-xs">· {client.phone}</span>}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {services?.map((s: string, i: number) => (
          <span key={i} className="text-xs bg-zinc-100 text-zinc-600 rounded-full px-2.5 py-1">{s}</span>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900">{formatCurrency(appt.total_amount)}</span>
        <div className="flex gap-2">
          {appt.status === 'pending' && (
            <button
              onClick={() => onStatusChange(appt.id, 'confirmed')}
              className="text-xs tracking-widest uppercase border border-zinc-200 px-3 py-1.5 rounded-full hover:border-zinc-900 hover:text-zinc-900 text-zinc-600 transition-colors"
            >
              Confirm
            </button>
          )}
          {appt.status === 'confirmed' && (
            <button
              onClick={() => onStatusChange(appt.id, 'in_progress')}
              className="text-xs tracking-widest uppercase bg-zinc-900 text-white px-3 py-1.5 rounded-full hover:bg-zinc-700 transition-colors"
            >
              Start
            </button>
          )}
          {appt.status === 'in_progress' && (
            <button
              onClick={() => onStatusChange(appt.id, 'completed')}
              className="text-xs tracking-widest uppercase bg-zinc-900 text-white px-3 py-1.5 rounded-full hover:bg-zinc-700 transition-colors flex items-center gap-1"
            >
              <CheckCircle className="h-3 w-3" /> Complete
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => setNotesOpen(!notesOpen)}
        className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-900 transition-colors mt-3"
      >
        <PenLine className="h-3 w-3" />
        {notesOpen ? 'Hide notes' : (notes ? 'Edit notes' : 'Add note')}
        {notesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {notesOpen && (
        <div className="mt-2 flex gap-2">
          <Input
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Allergies, preferences, special requests..."
            className="text-xs rounded-xl border-zinc-200"
          />
          <button
            onClick={saveNotes}
            disabled={saving}
            className="flex-shrink-0 w-9 h-9 border border-zinc-200 rounded-xl flex items-center justify-center hover:border-zinc-900 transition-colors disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5 text-zinc-600" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Availability Editor ─────────────────────────────────────────────────────

function AvailabilityEditor({ staff }: { staff: Staff | null }) {
  const initial = DAY_LABELS.map((_, i) => {
    const existing = (staff as any)?.availability?.find((a: any) => a.day_of_week === i)
    return {
      day: i,
      is_available: existing?.is_available ?? (i >= 1 && i <= 5),
      start_time: existing?.start_time?.slice(0, 5) ?? '09:00',
      end_time: existing?.end_time?.slice(0, 5) ?? '17:00',
    }
  })

  const [schedule, setSchedule] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(day: number) {
    setSchedule(prev => prev.map(d => d.day === day ? { ...d, is_available: !d.is_available } : d))
  }

  function setTime(day: number, field: 'start_time' | 'end_time', val: string) {
    setSchedule(prev => prev.map(d => d.day === day ? { ...d, [field]: val } : d))
  }

  async function save() {
    if (!staff?.id) { setSaved(true); setTimeout(() => setSaved(false), 2000); return }
    setSaving(true)
    const res = await fetch('/api/staff/availability', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: staff.id, schedule }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  return (
    <div>
      <div className="space-y-2 mb-6">
        {schedule.map(day => (
          <div key={day.day} className="flex items-center gap-3 bg-white rounded-xl border border-zinc-100 p-3">
            <button
              onClick={() => toggle(day.day)}
              className={`w-10 text-xs font-medium rounded-lg py-2 transition-colors flex-shrink-0 ${
                day.is_available
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-400'
              }`}
            >
              {DAY_LABELS[day.day]}
            </button>

            {day.is_available ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="time"
                  value={day.start_time}
                  onChange={e => setTime(day.day, 'start_time', e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-2 text-sm flex-1 min-w-0 outline-none focus:border-zinc-900"
                />
                <span className="text-zinc-400 text-sm flex-shrink-0">–</span>
                <input
                  type="time"
                  value={day.end_time}
                  onChange={e => setTime(day.day, 'end_time', e.target.value)}
                  className="h-9 rounded-lg border border-zinc-200 px-2 text-sm flex-1 min-w-0 outline-none focus:border-zinc-900"
                />
              </div>
            ) : (
              <span className="text-sm text-zinc-400 flex-1">Day off</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-6 py-3 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-40"
        >
          <Save className="h-3.5 w-3.5" />
          {saving ? 'Saving...' : 'Save Schedule'}
        </button>
        {saved && <p className="text-zinc-500 text-xs tracking-wide">Schedule saved.</p>}
      </div>
    </div>
  )
}

// ─── Walk-in Booking Form ────────────────────────────────────────────────────

function WalkInForm({ services, allStaff, staffId }: { services: Service[]; allStaff: any[]; staffId: string }) {
  const [phone, setPhone] = useState('')
  const [clientName, setClientName] = useState('')
  const [foundClient, setFoundClient] = useState<any>(null)
  const [searching, setSearching] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('09:00')
  const [assignedStaff, setAssignedStaff] = useState(staffId)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const categories = Array.from(new Set(services.map(s => s.category?.id))).map(id =>
    services.find(s => s.category?.id === id)?.category
  ).filter(Boolean)

  async function searchClient() {
    if (!phone) return
    setSearching(true)
    setFoundClient(null)
    const res = await fetch(`/api/staff/client-search?phone=${encodeURIComponent(phone)}`)
    const data = await res.json()
    setSearching(false)
    if (data.client) {
      setFoundClient(data.client)
      setClientName(data.client.full_name)
    }
  }

  function toggleService(id: string) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  async function book() {
    if (!foundClient?.id || selectedServices.length === 0) return
    setLoading(true)
    setResult(null)
    const res = await fetch('/api/staff/walkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: foundClient.id, serviceIds: selectedServices, staffId: assignedStaff, date, startTime, notes }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) {
      setResult({ ok: false, msg: data.error })
    } else {
      setResult({ ok: true, msg: `Appointment created for ${clientName}` })
      setSelectedServices([])
      setPhone(''); setClientName(''); setFoundClient(null); setNotes('')
    }
  }

  return (
    <div className="space-y-5">
      {/* Client lookup */}
      <div>
        <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">Client Phone</label>
        <div className="flex gap-2">
          <Input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="flex-1 rounded-xl border-zinc-200 text-sm"
          />
          <button
            onClick={searchClient}
            disabled={searching || !phone}
            className="inline-flex items-center gap-1.5 text-xs tracking-widest uppercase border border-zinc-200 px-4 py-2 rounded-full hover:border-zinc-900 transition-colors disabled:opacity-40"
          >
            <Search className="h-3 w-3" />
            {searching ? 'Searching...' : 'Find'}
          </button>
        </div>
        {foundClient && (
          <div className="mt-2 p-3 bg-zinc-50 rounded-xl text-sm text-zinc-900 border border-zinc-100">
            Found: <span className="font-medium">{foundClient.full_name}</span>
          </div>
        )}
        {!foundClient && phone && !searching && (
          <p className="mt-2 text-xs text-zinc-400">Client not found — they need to register first or use the admin panel.</p>
        )}
      </div>

      {/* Services */}
      <div>
        <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-2">Services</label>
        {services.length === 0 ? (
          <p className="text-sm text-zinc-400 py-3">No services configured yet. Contact your admin.</p>
        ) : (
        <div className="space-y-3">
          {categories.map(cat => (
            <div key={cat!.id}>
              <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-400 mb-2">{cat!.name_en}</p>
              <div className="grid grid-cols-2 gap-2">
                {services.filter(s => s.category_id === cat!.id).map(svc => (
                  <button
                    key={svc.id}
                    onClick={() => toggleService(svc.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${
                      selectedServices.includes(svc.id)
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 text-zinc-700 hover:border-zinc-400'
                    }`}
                  >
                    <p className="font-medium">{svc.name_en}</p>
                    <p className={`mt-0.5 ${selectedServices.includes(svc.id) ? 'text-zinc-300' : 'text-zinc-400'}`}>
                      {svc.duration_minutes}min · {formatCurrency(svc.price)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Date, time, staff */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
          />
        </div>
        <div>
          <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">Start Time</label>
          <input
            type="time"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
            className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">Staff</label>
          <select
            value={assignedStaff}
            onChange={e => setAssignedStaff(e.target.value)}
            className="w-full h-10 rounded-xl border border-zinc-200 px-3 text-sm outline-none focus:border-zinc-900 bg-white"
          >
            {allStaff.length > 0 ? allStaff.map(s => (
              <option key={s.id} value={s.id}>{s.profile?.full_name ?? s.id}</option>
            )) : (
              <option value="">Any available</option>
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 block mb-1.5">Notes (optional)</label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Allergies, special requests..." className="rounded-xl border-zinc-200 text-sm" />
      </div>

      {result && (
        <div className={`text-sm p-4 rounded-xl border ${result.ok ? 'bg-zinc-50 text-zinc-700 border-zinc-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {result.msg}
        </div>
      )}

      <button
        onClick={book}
        disabled={loading || !foundClient || selectedServices.length === 0}
        className="w-full inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium py-4 rounded-full hover:bg-zinc-700 transition-colors disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
        {loading ? 'Creating...' : 'Create Walk-in Appointment'}
      </button>
    </div>
  )
}

// ─── Earnings Panel ──────────────────────────────────────────────────────────

function EarningsPanel({ earnings }: { earnings: Earnings }) {
  const stats = [
    { label: 'This Week', revenue: earnings.weekRevenue, bookings: earnings.weekBookings },
    { label: 'This Month', revenue: earnings.monthRevenue, bookings: earnings.monthBookings },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white border border-zinc-100 rounded-2xl p-5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center mb-4">
              <TrendingUp className="h-4 w-4 text-zinc-600" />
            </div>
            <p className="text-2xl font-light text-zinc-900" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
              {formatCurrency(s.revenue)}
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mt-1">{s.label}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.bookings} appointments</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-zinc-100 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-1">
          <DollarSign className="h-4 w-4 text-zinc-400" />
          <p className="text-sm text-zinc-500">Average per appointment</p>
        </div>
        <p className="text-2xl font-light text-zinc-900" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
          {earnings.monthBookings > 0
            ? formatCurrency(Math.round(earnings.monthRevenue / earnings.monthBookings))
            : '—'}
        </p>
        <p className="text-xs text-zinc-400 mt-1">Based on this month</p>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StaffDashboard({
  staff,
  profile,
  todayAppts,
  upcomingAppts,
  earnings,
  services,
  allStaff,
  locale,
}: Props) {
  const t = useTranslations('staff')
  const [tab, setTab] = useState<Tab>('Today')

  const [today, setToday] = useState<any[]>(todayAppts)
  const [upcoming, setUpcoming] = useState<any[]>(upcomingAppts)

  const supabase = createClient()

  async function updateStatus(appointmentId: string, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', appointmentId)
    setToday(prev => prev.map(a => a.id === appointmentId ? { ...a, status } : a))
    setUpcoming(prev => prev.map(a => a.id === appointmentId ? { ...a, status } : a))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Staff Portal</p>
          <h1
            className="text-2xl font-light text-zinc-900 tracking-tight"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            {profile?.full_name ?? 'Your Dashboard'}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400">Today</p>
          <p className="text-sm font-medium text-zinc-900 mt-0.5">{today.length} appointments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-xs tracking-widest uppercase font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              tab === t
                ? 'bg-zinc-900 text-white'
                : 'border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-900'
            }`}
          >
            {t === 'Today' && today.length > 0 ? `Today (${today.length})` : t}
          </button>
        ))}
      </div>

      {/* Today */}
      {tab === 'Today' && (
        <section>
          {today.length === 0 ? (
            <div className="border border-zinc-100 rounded-2xl p-8 text-center text-zinc-400 text-sm">
              {t('noAppointments')}
            </div>
          ) : (
            <div className="space-y-3">
              {today.map(a => (
                <ApptCard key={a.id} appt={a} onStatusChange={updateStatus} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Upcoming */}
      {tab === 'Upcoming' && (
        <section>
          {upcoming.length === 0 ? (
            <div className="border border-zinc-100 rounded-2xl p-8 text-center text-zinc-400 text-sm">
              No upcoming appointments.
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(a => (
                <ApptCard key={a.id} appt={a} showDate onStatusChange={updateStatus} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Walk-in */}
      {tab === 'Walk-in' && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6">
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Walk-in</p>
            <h2 className="text-lg font-light text-zinc-900" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
              New Appointment
            </h2>
          </div>
          <WalkInForm services={services} allStaff={allStaff} staffId={staff?.id ?? ''} />
        </div>
      )}

      {/* Availability */}
      {tab === 'Availability' && (
        <div className="bg-white border border-zinc-100 rounded-2xl p-6">
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Availability</p>
            <h2 className="text-lg font-light text-zinc-900" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
              Weekly Schedule
            </h2>
          </div>
          <AvailabilityEditor staff={staff} />
        </div>
      )}

      {/* Earnings */}
      {tab === 'Earnings' && (
        <div>
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Earnings</p>
            <h2 className="text-lg font-light text-zinc-900" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
              Performance
            </h2>
          </div>
          <EarningsPanel earnings={earnings} />
        </div>
      )}
    </div>
  )
}
