'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, User, Plus, Pencil, X, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── Constants ───────────────────────────────────────────────────────────────

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DEFAULT_AVAILABILITY = DAY_LABELS.map((_, i) => ({
  day_of_week: i,
  is_available: i >= 1 && i <= 6, // Mon–Sat on by default
  start_time: '09:00',
  end_time: '19:00',
}))

const COLOR_PRESETS = [
  '#18181b', '#3f3f46', '#71717a', '#a1a1aa',
  '#b45309', '#15803d', '#1d4ed8', '#7c3aed',
  '#be123c', '#0e7490', '#c2410c', '#4d7c0f',
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface AvailDay {
  day_of_week: number
  is_available: boolean
  start_time: string
  end_time: string
}

interface StaffForm {
  full_name: string
  phone: string
  email: string
  password: string
  color: string
  bio: string
}

const EMPTY_FORM: StaffForm = {
  full_name: '',
  phone: '',
  email: '',
  password: '',
  color: '#3f3f46',
  bio: '',
}

interface Props {
  staffList: any[]
  locale: string
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AdminStaff({ staffList: initial, locale }: Props) {
  const [staffList, setStaffList] = useState<any[]>(initial)
  const [mode, setMode] = useState<'list' | 'add' | 'edit'>('list')
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  const [form, setForm] = useState<StaffForm>(EMPTY_FORM)
  const [availability, setAvailability] = useState<AvailDay[]>(DEFAULT_AVAILABILITY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  // ── Panel openers ──

  function openAdd() {
    setForm(EMPTY_FORM)
    setAvailability(DEFAULT_AVAILABILITY)
    setError('')
    setSaved(false)
    setMode('add')
  }

  function openEdit(staff: any) {
    const profile = staff.profile as any
    setEditingStaff(staff)
    setForm({
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      email: profile?.email ?? '',
      password: '',
      color: staff.color ?? '#3f3f46',
      bio: staff.bio ?? '',
    })
    // Merge existing availability with defaults for missing days
    const merged = DEFAULT_AVAILABILITY.map(def => {
      const existing = (staff.availability ?? []).find((a: any) => a.day_of_week === def.day_of_week)
      return existing
        ? { day_of_week: existing.day_of_week, is_available: existing.is_available, start_time: existing.start_time?.slice(0, 5) ?? '09:00', end_time: existing.end_time?.slice(0, 5) ?? '19:00' }
        : def
    })
    setAvailability(merged)
    setError('')
    setSaved(false)
    setMode('edit')
  }

  function close() {
    setMode('list')
    setEditingStaff(null)
    setError('')
    setSaved(false)
  }

  // ── Availability helper ──

  function patchDay(dayIndex: number, patch: Partial<AvailDay>) {
    setAvailability(prev => prev.map(d => d.day_of_week === dayIndex ? { ...d, ...patch } : d))
  }

  // ── Submit handlers ──

  async function handleAdd() {
    setLoading(true); setError('')
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, availability }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    setStaffList(prev => [...prev, data.staff])
    close()
  }

  async function handleEdit() {
    setLoading(true); setError('')
    const res = await fetch(`/api/admin/staff/${editingStaff.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, availability }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) { setError(data.error); return }
    setStaffList(prev => prev.map(s => s.id === editingStaff.id ? data.staff : s))
    setSaved(true)
    setTimeout(close, 900)
  }

  async function toggleActive(staff: any) {
    const res = await fetch(`/api/admin/staff/${staff.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !staff.is_active }),
    })
    const data = await res.json()
    if (!data.error) setStaffList(prev => prev.map(s => s.id === staff.id ? data.staff : s))
  }

  // ─── Edit / Add panel ───────────────────────────────────────────────────────

  if (mode !== 'list') {
    const isAdd = mode === 'add'
    const canSubmit = !loading && !!form.full_name && !!form.phone && (isAdd ? !!form.email && form.password.length >= 8 : true)

    return (
      <div>
        {/* Panel header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={close}
            className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-600 touch-manipulation"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              {isAdd ? 'Add Staff Member' : 'Edit Staff'}
            </h1>
            {!isAdd && editingStaff && (
              <p className="text-sm text-zinc-400">{editingStaff.profile?.full_name}</p>
            )}
          </div>
        </div>

        <div className="max-w-2xl space-y-5">

          {/* ── Personal Info ── */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 font-medium">
                Staff Info
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Full Name *</label>
                  <Input
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="Jane Smith"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Phone *</label>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 555 000 0000"
                    type="tel"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Email {isAdd ? '*' : ''}
                  </label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="jane@example.com"
                  />
                </div>
                {isAdd && (
                  <div>
                    <label className="text-xs text-zinc-500 block mb-1">
                      Temporary Password * <span className="text-zinc-300">(min. 8 chars)</span>
                    </label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                )}
                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-500 block mb-1">Bio</label>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Short bio shown to clients when booking..."
                    rows={2}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 resize-none"
                  />
                </div>
              </div>

              {/* Color picker */}
              <div>
                <label className="text-xs text-zinc-500 block mb-2">Calendar Color</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {COLOR_PRESETS.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      title={c}
                      className="w-7 h-7 rounded-full transition-all touch-manipulation hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: form.color === c ? `2px solid ${c}` : 'none',
                        outlineOffset: '2px',
                        border: form.color === c ? '2px solid white' : '2px solid transparent',
                      }}
                    />
                  ))}
                  {/* Free color input */}
                  <label className="w-7 h-7 rounded-full border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer hover:border-zinc-500 transition-colors" title="Custom colour">
                    <span className="text-[10px] text-zinc-400">+</span>
                    <input
                      type="color"
                      value={form.color}
                      onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="sr-only"
                    />
                  </label>
                  <span className="text-xs text-zinc-400 font-mono ml-1">{form.color}</span>
                </div>

                {/* Avatar preview */}
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
                    style={{ backgroundColor: form.color }}
                  >
                    {form.full_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="text-xs text-zinc-400">Preview on calendar &amp; booking</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Weekly Schedule ── */}
          <Card>
            <CardContent className="p-5">
              <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 font-medium mb-4">
                Weekly Schedule
              </p>
              <p className="text-xs text-zinc-400 mb-4">
                Toggle each day on/off and set working hours.
              </p>

              <div className="space-y-2.5">
                {availability.map(day => (
                  <div key={day.day_of_week} className="flex items-center gap-3 min-h-[40px]">
                    {/* Day toggle pill */}
                    <button
                      onClick={() => patchDay(day.day_of_week, { is_available: !day.is_available })}
                      className={`w-14 flex-shrink-0 py-2 rounded-full text-xs font-semibold border transition-colors touch-manipulation ${
                        day.is_available
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-400'
                      }`}
                    >
                      {DAY_LABELS[day.day_of_week]}
                    </button>

                    {day.is_available ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="time"
                          value={day.start_time}
                          onChange={e => patchDay(day.day_of_week, { start_time: e.target.value })}
                          className="flex-1 min-w-0 h-9 rounded-lg border border-zinc-200 px-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                        />
                        <span className="text-zinc-300 text-xs flex-shrink-0">→</span>
                        <input
                          type="time"
                          value={day.end_time}
                          onChange={e => patchDay(day.day_of_week, { end_time: e.target.value })}
                          className="flex-1 min-w-0 h-9 rounded-lg border border-zinc-200 px-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-300">Day off</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Quick presets */}
              <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap gap-2">
                <span className="text-xs text-zinc-400 self-center mr-1">Presets:</span>
                <button
                  onClick={() => setAvailability(
                    DEFAULT_AVAILABILITY.map(d => ({ ...d, is_available: d.day_of_week >= 1 && d.day_of_week <= 5 }))
                  )}
                  className="text-xs px-3 py-1.5 border border-zinc-200 rounded-full hover:border-zinc-900 hover:text-zinc-900 text-zinc-500 transition-colors touch-manipulation"
                >
                  Mon–Fri
                </button>
                <button
                  onClick={() => setAvailability(
                    DEFAULT_AVAILABILITY.map(d => ({ ...d, is_available: d.day_of_week >= 1 && d.day_of_week <= 6 }))
                  )}
                  className="text-xs px-3 py-1.5 border border-zinc-200 rounded-full hover:border-zinc-900 hover:text-zinc-900 text-zinc-500 transition-colors touch-manipulation"
                >
                  Mon–Sat
                </button>
                <button
                  onClick={() => setAvailability(
                    DEFAULT_AVAILABILITY.map(d => ({ ...d, is_available: true }))
                  )}
                  className="text-xs px-3 py-1.5 border border-zinc-200 rounded-full hover:border-zinc-900 hover:text-zinc-900 text-zinc-500 transition-colors touch-manipulation"
                >
                  Every day
                </button>
              </div>
            </CardContent>
          </Card>

          {/* ── Feedback ── */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          {saved && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-center gap-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              Changes saved successfully
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex gap-3 pb-12">
            <Button variant="outline" onClick={close} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={isAdd ? handleAdd : handleEdit}
              disabled={!canSubmit}
            >
              {loading
                ? (isAdd ? 'Creating…' : 'Saving…')
                : (isAdd ? 'Create Staff Member' : 'Save Changes')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Staff list ────────────────────────────────────────────────────────────

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/admin`} className="text-zinc-400 hover:text-zinc-600 touch-manipulation">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Staff Management</h1>
            <p className="text-xs text-zinc-400 mt-0.5">{staffList.length} team member{staffList.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add Staff
        </Button>
      </div>

      {staffList.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-10 w-10 text-zinc-200 mx-auto mb-4" />
            <p className="text-zinc-500 mb-1">No staff members yet</p>
            <p className="text-xs text-zinc-400 mb-5">Add your first team member to start accepting bookings.</p>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4 mr-1" /> Add Staff Member
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {staffList.map(staff => {
          const profile = staff.profile as any
          const avails = (staff.availability ?? []) as any[]

          return (
            <Card key={staff.id}>
              <CardContent className="p-5">
                {/* Header row */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ backgroundColor: staff.color ?? '#3f3f46' }}
                  >
                    {profile?.full_name?.[0]?.toUpperCase() ?? <User className="h-5 w-5" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-zinc-900 leading-tight">{profile?.full_name ?? '—'}</p>
                    {profile?.phone && <p className="text-xs text-zinc-400 mt-0.5">{profile.phone}</p>}
                    {profile?.email && <p className="text-xs text-zinc-400">{profile.email}</p>}
                    {staff.bio && (
                      <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{staff.bio}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Active toggle */}
                    <button
                      onClick={() => toggleActive(staff)}
                      title={staff.is_active ? 'Click to deactivate' : 'Click to activate'}
                      className="touch-manipulation"
                    >
                      <Badge variant={staff.is_active ? 'success' : 'secondary'}>
                        {staff.is_active ? 'Active' : 'Off'}
                      </Badge>
                    </button>
                    {/* Edit button */}
                    <button
                      onClick={() => openEdit(staff)}
                      className="p-1.5 hover:bg-zinc-100 rounded-lg touch-manipulation"
                      title="Edit staff"
                    >
                      <Pencil className="h-4 w-4 text-zinc-400" />
                    </button>
                  </div>
                </div>

                {/* Weekly schedule grid */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
                  {DAY_LABELS.map((day, i) => {
                    const avail = avails.find((a: any) => a.day_of_week === i)
                    return (
                      <div
                        key={day}
                        className={`p-1.5 rounded-lg ${avail?.is_available ? 'bg-green-50 text-green-700' : 'bg-zinc-50 text-zinc-300'}`}
                      >
                        <p className="font-semibold">{day}</p>
                        {avail?.is_available
                          ? <>
                              <p>{avail.start_time?.slice(0, 5)}</p>
                              <p>{avail.end_time?.slice(0, 5)}</p>
                            </>
                          : <p className="mt-0.5">Off</p>
                        }
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
