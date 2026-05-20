'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Search, Star, Phone } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface Props {
  clients: any[]
  locale: string
}

export default function AdminClients({ clients, locale }: Props) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.full_name?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/${locale}/admin`} className="text-zinc-400 hover:text-zinc-600">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-zinc-900">Clients</h1>
        <span className="text-sm text-zinc-400">({filtered.length})</span>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-50">
            {filtered.length === 0 && (
              <p className="text-center text-zinc-400 py-12">
                No clients found
              </p>
            )}
            {filtered.map(client => {
              const loyalty = Array.isArray(client.loyalty) ? client.loyalty[0] : client.loyalty
              return (
                <div key={client.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900">{client.full_name ?? '—'}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {client.phone && (
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Phone className="h-3 w-3" />
                          {client.phone}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400">
                        {new Date(client.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {loyalty && (
                    <div className="flex items-center gap-1 text-sm font-semibold text-zinc-700 ml-4">
                      <Star className="h-4 w-4" />
                      {loyalty.points?.toLocaleString() ?? 0}
                      <span className="text-xs font-normal text-zinc-400 ml-0.5">pts</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
