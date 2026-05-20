'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Search, Filter } from 'lucide-react'
import { useLocale } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const STATUS_VARIANT: Record<string, any> = {
  pending: 'warning',
  confirmed: 'success',
  in_progress: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
}

const ALL_STATUSES = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled']

interface Props {
  appointments: any[]
  locale: string
}

export default function AdminAppointments({ appointments: initial, locale }: Props) {
  const [appointments, setAppointments] = useState(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const supabase = createClient()

  async function updateStatus(id: string, status: string) {
    await supabase.from('appointments').update({ status }).eq('id', id)
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const filtered = appointments.filter(a => {
    const client = a.client as any
    const matchSearch = !search ||
      client?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      client?.phone?.includes(search)
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/admin`} className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">All Appointments</h1>
        <span className="text-sm text-zinc-400">({filtered.length})</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search client..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors touch-manipulation ${
                statusFilter === s
                  ? 'bg-zinc-900 border-zinc-900 text-white'
                  : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
              }`}
            >
              {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Client
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wide hidden sm:table-cell">
                    Date & Time
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wide hidden md:table-cell">
                    Staff
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-zinc-500 text-xs uppercase tracking-wide">
                    Total
                  </th>
                  <th className="py-3 px-4 hidden lg:table-cell" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-zinc-400 py-12">
                      No appointments found
                    </td>
                  </tr>
                )}
                {filtered.map(appt => {
                  const client = appt.client as any
                  const staff = appt.staff as any
                  return (
                    <tr key={appt.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-zinc-900">{client?.full_name ?? '—'}</p>
                        <p className="text-xs text-zinc-400">{client?.phone}</p>
                        <p className="text-xs text-zinc-400 sm:hidden">{formatDate(appt.date)} · {formatTime(appt.start_time)}</p>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <p className="text-zinc-900">{formatDate(appt.date)}</p>
                        <p className="text-xs text-zinc-400">{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</p>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell text-zinc-700">
                        {staff?.profile?.full_name ?? '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_VARIANT[appt.status]}>
                          {appt.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-zinc-900">
                        {formatCurrency(appt.total_amount)}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {appt.status === 'pending' && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(appt.id, 'confirmed')}>
                            Confirm
                          </Button>
                        )}
                        {appt.status === 'confirmed' && (
                          <Button size="sm" onClick={() => updateStatus(appt.id, 'in_progress')}>
                            Start
                          </Button>
                        )}
                        {appt.status === 'in_progress' && (
                          <Button size="sm" onClick={() => updateStatus(appt.id, 'completed')}>
                            Complete
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
