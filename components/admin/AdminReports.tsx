'use client'

import { useMemo } from 'react'
import { TrendingUp, Users, BarChart3, Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Props {
  appointments: any[]
  staffStats: any[]
  allClients: any[]
  locale: string
}

export default function AdminReports({ appointments, staffStats, allClients, locale }: Props) {
  const totalRevenue = useMemo(
    () => appointments.reduce((a, b) => a + (b.total_amount ?? 0), 0),
    [appointments]
  )

  // Revenue by day — last 14 days
  const revenueByDay = useMemo(() => {
    const map: Record<string, number> = {}
    appointments.forEach(a => {
      map[a.date] = (map[a.date] ?? 0) + a.total_amount
    })
    // Fill last 14 calendar days
    const days: { date: string; revenue: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
      days.push({ date: d, revenue: map[d] ?? 0 })
    }
    return days
  }, [appointments])

  const maxRevenue = Math.max(...revenueByDay.map(d => d.revenue), 1)

  // Peak hours — bookings per hour
  const peakHours = useMemo(() => {
    const counts: number[] = Array(24).fill(0)
    appointments.forEach(a => {
      if (a.start_time) {
        const hour = parseInt(a.start_time.slice(0, 2), 10)
        if (!isNaN(hour)) counts[hour]++
      }
    })
    const maxCount = Math.max(...counts, 1)
    return counts.map((count, hour) => ({ hour, count, pct: count / maxCount }))
  }, [appointments])

  // Staff performance
  const staffBookings = useMemo(() => {
    const map: Record<string, { name: string; bookings: number; revenue: number }> = {}
    staffStats.forEach(a => {
      const id = a.staff_id
      const name = (a.staff as any)?.profile?.full_name ?? 'Unknown'
      if (!map[id]) map[id] = { name, bookings: 0, revenue: 0 }
      map[id].bookings++
      map[id].revenue += a.total_amount ?? 0
    })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue)
  }, [staffStats])

  // Top services
  const topServices = useMemo(() => {
    const map: Record<string, number> = {}
    appointments.forEach(a => {
      a.services?.forEach((as: any) => {
        const name = as.service?.name_en
        if (name) map[name] = (map[name] ?? 0) + 1
      })
    })
    return Object.entries(map).sort(([, a], [, b]) => b - a).slice(0, 6)
  }, [appointments])

  const maxService = topServices[0]?.[1] ?? 1

  // Client stats
  const { newClients, returningClients } = useMemo(() => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString()
    const newCount = allClients.filter(c => c.created_at >= thirtyDaysAgo).length
    const returningCount = Math.max(0, new Set(appointments.map(a => a.client_id)).size - newCount)
    return { newClients: newCount, returningClients: returningCount }
  }, [allClients, appointments])

  const avgPerBooking = appointments.length > 0 ? Math.round(totalRevenue / appointments.length) : 0

  return (
    <div>
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Analytics</p>
        <h1
          className="text-2xl font-light text-zinc-900 tracking-tight"
          style={{ fontFamily: 'var(--font-cormorant), serif' }}
        >
          Reports — Last 30 Days
        </h1>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: TrendingUp },
          { label: 'Total Bookings', value: appointments.length.toString(), icon: BarChart3 },
          { label: 'New Clients', value: newClients.toString(), icon: Users },
          { label: 'Avg / Booking', value: formatCurrency(avgPerBooking), icon: Star },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-zinc-100 rounded-2xl p-5">
            <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center mb-4">
              <Icon className="h-4 w-4 text-zinc-600" />
            </div>
            <p
              className="text-2xl font-light text-zinc-900 mb-1"
              style={{ fontFamily: 'var(--font-cormorant), serif' }}
            >
              {value}
            </p>
            <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-0.5">Revenue</p>
            <p className="text-sm text-zinc-600">Last 14 days</p>
          </div>
          <p className="text-sm font-medium text-zinc-900">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="flex items-end gap-1 h-36">
          {revenueByDay.map(({ date, revenue }) => {
            const pct = revenue / maxRevenue
            const isToday = date === new Date().toISOString().split('T')[0]
            return (
              <div key={date} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {formatCurrency(revenue)}
                </div>
                <div className="w-full flex items-end" style={{ height: '120px' }}>
                  <div
                    className={`w-full rounded-t transition-all ${isToday ? 'bg-zinc-900' : 'bg-zinc-200 group-hover:bg-zinc-400'}`}
                    style={{ height: `${Math.max(pct * 100, revenue > 0 ? 4 : 0)}%`, minHeight: revenue > 0 ? 2 : 0 }}
                  />
                </div>
                <span className={`text-[9px] ${isToday ? 'text-zinc-900 font-medium' : 'text-zinc-300'}`}>
                  {date.slice(5).replace('-', '/')}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Peak hours */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6 mb-6">
        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Busiest Hours</p>
        <p className="text-sm text-zinc-600 mb-4">Bookings by hour of day</p>
        <div className="flex items-end gap-0.5 h-16">
          {peakHours.slice(8, 20).map(({ hour, count, pct }) => (
            <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                {hour}:00 — {count}
              </div>
              <div className="w-full" style={{ height: '48px' }}>
                <div
                  className="w-full rounded-sm bg-zinc-200 group-hover:bg-zinc-900 transition-colors"
                  style={{ height: `${Math.max(pct * 100, count > 0 ? 8 : 0)}%`, minHeight: count > 0 ? 2 : 0 }}
                />
              </div>
              <span className="text-[8px] text-zinc-300">{hour}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-300 mt-2">Hours 8 am – 7 pm shown</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Staff performance */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Staff</p>
          <p className="text-sm text-zinc-600 mb-4">Performance this month</p>
          {staffBookings.length === 0 ? (
            <p className="text-sm text-zinc-300">No data</p>
          ) : (
            <div className="space-y-4">
              {staffBookings.map(s => (
                <div key={s.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                    <p className="text-xs text-zinc-500">{s.bookings} · {formatCurrency(s.revenue)}</p>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900 rounded-full transition-all"
                      style={{ width: `${(s.revenue / (staffBookings[0]?.revenue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top services */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Services</p>
          <p className="text-sm text-zinc-600 mb-4">Most booked this month</p>
          {topServices.length === 0 ? (
            <p className="text-sm text-zinc-300">No data</p>
          ) : (
            <div className="space-y-3">
              {topServices.map(([name, count]) => (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm text-zinc-900 truncate flex-1 pr-3">{name}</p>
                    <span className="text-xs font-medium text-zinc-500 flex-shrink-0">{count}×</span>
                  </div>
                  <div className="h-1 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-400 rounded-full"
                      style={{ width: `${(count / maxService) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client split */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-6">
        <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">Clients</p>
        <p className="text-sm text-zinc-600 mb-5">New vs. returning this month</p>
        <div className="flex items-center gap-6">
          <div>
            <p
              className="text-3xl font-light text-zinc-900"
              style={{ fontFamily: 'var(--font-cormorant), serif' }}
            >
              {newClients}
            </p>
            <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-400 mt-0.5">New</p>
          </div>
          <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
            {newClients + returningClients > 0 && (
              <div
                className="h-full bg-zinc-900 rounded-full"
                style={{ width: `${(newClients / (newClients + returningClients)) * 100}%` }}
              />
            )}
          </div>
          <div className="text-right">
            <p
              className="text-3xl font-light text-zinc-900"
              style={{ fontFamily: 'var(--font-cormorant), serif' }}
            >
              {returningClients}
            </p>
            <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-400 mt-0.5">Returning</p>
          </div>
        </div>
      </div>
    </div>
  )
}
