'use client'

import Link from 'next/link'
import { TrendingUp, Calendar, Users, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import type { Appointment, Staff } from '@/types'

interface Props {
  todayAppts: any[]
  monthAppts: any[]
  recentAppts: Appointment[]
  staffList: Staff[]
  todayRevenue: number
  monthRevenue: number
  locale: string
}

const STATUS_VARIANT: Record<string, any> = {
  pending: 'warning',
  confirmed: 'success',
  in_progress: 'default',
  completed: 'secondary',
  cancelled: 'destructive',
}

export default function AdminDashboard({
  todayAppts,
  monthAppts,
  recentAppts,
  staffList,
  todayRevenue,
  monthRevenue,
  locale,
}: Props) {
  const stats = [
    {
      label: "Today's Revenue",
      value: formatCurrency(todayRevenue),
      sub: `${todayAppts.length} bookings`,
      icon: <TrendingUp className="h-5 w-5 text-zinc-600" />,
      bg: 'bg-zinc-100',
    },
    {
      label: 'This Month Revenue',
      value: formatCurrency(monthRevenue),
      sub: `${monthAppts.length} bookings`,
      icon: <TrendingUp className="h-5 w-5 text-zinc-600" />,
      bg: 'bg-zinc-100',
    },
    {
      label: 'Active Staff',
      value: staffList.length,
      sub: 'nail technicians',
      icon: <Users className="h-5 w-5 text-zinc-600" />,
      bg: 'bg-zinc-100',
    },
    {
      label: "Today's Appointments",
      value: todayAppts.length,
      sub: 'scheduled',
      icon: <Calendar className="h-5 w-5 text-zinc-600" />,
      bg: 'bg-zinc-100',
    },
  ]

  const navLinks = [
    { href: `/${locale}/admin/calendar`, label: 'Calendar' },
    { href: `/${locale}/admin/appointments`, label: 'All Appointments' },
    { href: `/${locale}/admin/services`, label: 'Services' },
    { href: `/${locale}/admin/staff`, label: 'Staff' },
    { href: `/${locale}/admin/promo-codes`, label: 'Promo Codes' },
    { href: `/${locale}/admin/reports`, label: 'Reports' },
    { href: `/${locale}/admin/clients`, label: 'Clients' },
    { href: `/${locale}/admin/gift-cards`, label: 'Gift Cards' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-8">Admin Dashboard</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
              <p className="text-xs text-zinc-400">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        {navLinks.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center justify-between p-4 bg-white rounded-xl border border-zinc-100 hover:border-zinc-900 hover:shadow-sm transition-all text-sm font-medium text-zinc-700"
          >
            {link.label}
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          </Link>
        ))}
      </div>

      {/* Recent appointments */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recent Appointments</CardTitle>
            <Link href={`/${locale}/admin/appointments`} className="text-sm text-zinc-600 hover:underline">
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentAppts.slice(0, 8).map(appt => {
              const client = (appt as any).client
              const services = (appt as any).services?.map((as: any) => as.service?.name_en).filter(Boolean)

              return (
                <div key={appt.id} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-900 truncate">{client?.full_name ?? '—'}</p>
                      <Badge variant={STATUS_VARIANT[appt.status]} className="text-[10px] px-1.5 py-0">
                        {appt.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {formatDate(appt.date)} · {formatTime(appt.start_time)} · {services?.slice(0, 2).join(', ')}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-zinc-900 ml-3">{formatCurrency(appt.total_amount)}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
