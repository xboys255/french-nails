'use client'

import { useState } from 'react'
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import type { Service, ServiceCategory } from '@/types'

interface Props {
  services: Service[]
  categories: ServiceCategory[]
  locale: string
}

interface ServiceForm {
  name_en: string
  name_vi: string
  duration_minutes: number
  price: number
  category_id: string
}

const EMPTY_FORM: ServiceForm = { name_en: '', name_vi: '', duration_minutes: 60, price: 0, category_id: '' }

export default function AdminServices({ services: initial, categories, locale }: Props) {
  const supabase = createClient()
  const [services, setServices] = useState(initial)
  const [editing, setEditing] = useState<Service | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM)
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const payload = { ...form, name_vi: form.name_en }
    if (editing) {
      const { data } = await supabase.from('services').update(payload).eq('id', editing.id).select('*, category:service_categories(*)').single()
      if (data) setServices(prev => prev.map(s => s.id === editing.id ? data : s))
    } else {
      const { data } = await supabase.from('services').insert({ ...payload, is_active: true }).select('*, category:service_categories(*)').single()
      if (data) setServices(prev => [...prev, data])
    }
    setEditing(null)
    setAdding(false)
    setForm(EMPTY_FORM)
    setLoading(false)
  }

  async function toggleActive(service: Service) {
    const { data } = await supabase
      .from('services')
      .update({ is_active: !service.is_active })
      .eq('id', service.id)
      .select('*, category:service_categories(*)')
      .single()
    if (data) setServices(prev => prev.map(s => s.id === service.id ? data : s))
  }

  function startEdit(service: Service) {
    setEditing(service)
    setAdding(false)
    setForm({ name_en: service.name_en, name_vi: service.name_en, duration_minutes: service.duration_minutes, price: service.price, category_id: service.category_id ?? '' })
  }

  const grouped = categories.map(cat => ({
    cat,
    items: services.filter(s => s.category_id === cat.id),
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Services</h1>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm(EMPTY_FORM) }}>
          <Plus className="h-4 w-4 mr-1" /> Add Service
        </Button>
      </div>

      {/* Form */}
      {(adding || editing) && (
        <Card className="mb-6 border-zinc-200">
          <CardContent className="p-5">
            <h3 className="font-semibold text-zinc-900 mb-4">{editing ? 'Edit Service' : 'New Service'}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Name (English)</label>
                <Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} placeholder="e.g. Gel Manicure" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Duration (minutes)</label>
                <Input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Price (cents, e.g. 3500 = $35)</label>
                <Input type="number" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Category</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm({ ...form, category_id: e.target.value })}
                  className="w-full h-10 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name_en}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={loading || !form.name_en || !form.category_id}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="outline" onClick={() => { setAdding(false); setEditing(null) }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service list by category */}
      <div className="space-y-6">
        {grouped.map(({ cat, items }) => (
          <div key={cat.id}>
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
              {cat.name_en}
            </h2>
            <div className="space-y-2">
              {items.map(service => (
                <div key={service.id} className="flex items-center justify-between bg-white rounded-xl border border-zinc-200 p-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-900">{service.name_en}</p>
                    <p className="text-xs text-zinc-400">{service.duration_minutes} min · {formatCurrency(service.price)}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Badge variant={service.is_active ? 'success' : 'secondary'}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <button onClick={() => startEdit(service)} className="p-1.5 hover:bg-zinc-100 rounded-lg touch-manipulation">
                      <Pencil className="h-4 w-4 text-zinc-400" />
                    </button>
                    <button onClick={() => toggleActive(service)} className="p-1.5 hover:bg-zinc-100 rounded-lg touch-manipulation">
                      {service.is_active
                        ? <ToggleRight className="h-5 w-5 text-green-500" />
                        : <ToggleLeft className="h-5 w-5 text-zinc-400" />}
                    </button>
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-sm text-zinc-400 pl-2">No services in this category yet.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
