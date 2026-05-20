'use client'

import { useState } from 'react'
import { Plus, ToggleLeft, ToggleRight, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import type { PromoCode } from '@/types'

interface PromoForm {
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number
  max_uses: string
  valid_from: string
  valid_until: string
}

const EMPTY: PromoForm = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: 0,
  max_uses: '',
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: '',
}

export default function AdminPromoCodes({ promoCodes: initial, locale }: { promoCodes: PromoCode[]; locale: string }) {
  const supabase = createClient()
  const [codes, setCodes] = useState(initial)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<PromoForm>(EMPTY)
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    const { data } = await supabase.from('promo_codes').insert({
      ...form,
      code: form.code.toUpperCase(),
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      valid_until: form.valid_until || null,
      is_active: true,
      uses_count: 0,
    }).select().single()
    if (data) setCodes(prev => [data, ...prev])
    setAdding(false)
    setForm(EMPTY)
    setLoading(false)
  }

  async function toggle(promo: PromoCode) {
    const { data } = await supabase.from('promo_codes').update({ is_active: !promo.is_active }).eq('id', promo.id).select().single()
    if (data) setCodes(prev => prev.map(p => p.id === promo.id ? data : p))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Promo Codes</h1>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-1" /> Create Code
        </Button>
      </div>

      {adding && (
        <Card className="mb-6 border-zinc-200">
          <CardContent className="p-5">
            <h3 className="font-semibold mb-4">New Promo Code</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Code</label>
                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Description</label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Summer special 20% off" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Discount Type</label>
                <select value={form.discount_type} onChange={e => setForm({ ...form, discount_type: e.target.value as any })} className="w-full h-10 rounded-lg border border-zinc-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (cents)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">
                  Discount Value {form.discount_type === 'percentage' ? '(%)' : '(cents)'}
                </label>
                <Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Min Order (cents)</label>
                <Input type="number" value={form.min_order_amount} onChange={e => setForm({ ...form, min_order_amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Max Uses (blank = unlimited)</label>
                <Input type="number" value={form.max_uses} onChange={e => setForm({ ...form, max_uses: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Valid From</label>
                <Input type="date" value={form.valid_from} onChange={e => setForm({ ...form, valid_from: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Valid Until (blank = no expiry)</label>
                <Input type="date" value={form.valid_until} onChange={e => setForm({ ...form, valid_until: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={loading || !form.code}>
                {loading ? 'Creating...' : 'Create Code'}
              </Button>
              <Button variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {codes.map(promo => (
          <div key={promo.id} className="flex items-center justify-between bg-white rounded-xl border border-zinc-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center">
                <Tag className="h-5 w-5 text-zinc-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-semibold text-zinc-900">{promo.code}</p>
                  <Badge variant={promo.is_active ? 'success' : 'secondary'}>
                    {promo.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400">
                  {promo.discount_type === 'percentage'
                    ? `${promo.discount_value}% off`
                    : `${formatCurrency(promo.discount_value)} off`}
                  {promo.max_uses ? ` · ${promo.uses_count}/${promo.max_uses} used` : ` · ${promo.uses_count} used`}
                  {promo.valid_until ? ` · expires ${promo.valid_until}` : ''}
                </p>
              </div>
            </div>
            <button onClick={() => toggle(promo)} className="p-1.5 hover:bg-zinc-100 rounded-lg touch-manipulation">
              {promo.is_active
                ? <ToggleRight className="h-6 w-6 text-green-500" />
                : <ToggleLeft className="h-6 w-6 text-zinc-400" />}
            </button>
          </div>
        ))}
        {codes.length === 0 && (
          <p className="text-zinc-400 text-sm">No promo codes yet.</p>
        )}
      </div>
    </div>
  )
}
