'use client'

import { useState } from 'react'
import { Gift, Plus, Copy, Check, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'

interface GiftCard {
  id: string
  code: string
  initial_balance: number
  remaining_balance: number
  is_active: boolean
  expires_at: string | null
  created_at: string
  purchased_by_name?: string
}

interface Props {
  initialCards: GiftCard[]
}

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 12 }, (_, i) =>
    (i > 0 && i % 4 === 0 ? '-' : '') + chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export default function AdminGiftCards({ initialCards }: Props) {
  const [cards, setCards] = useState<GiftCard[]>(initialCards)
  const [showCreate, setShowCreate] = useState(false)
  const [amount, setAmount] = useState('50')
  const [expiresAt, setExpiresAt] = useState('')
  const [generatedCode, setGeneratedCode] = useState(randomCode())
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function createCard() {
    const val = parseInt(amount)
    if (!val || val < 1) { setError('Enter a valid amount'); return }
    setCreating(true)
    setError('')
    const res = await fetch('/api/gift-card/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: generatedCode, initialBalance: val * 100, expiresAt: expiresAt || null }),
    })
    const data = await res.json()
    setCreating(false)
    if (data.error) { setError(data.error); return }
    setCards(prev => [data.card, ...prev])
    setShowCreate(false)
    setAmount('50')
    setExpiresAt('')
    setGeneratedCode(randomCode())
  }

  async function deactivate(id: string) {
    const res = await fetch('/api/gift-card/deactivate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setCards(prev => prev.map(c => c.id === id ? { ...c, is_active: false } : c))
    }
  }

  function copyCode(id: string, code: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const active = cards.filter(c => c.is_active)
  const inactive = cards.filter(c => !c.is_active)

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Gift className="h-6 w-6 text-zinc-600" />
          <h1 className="text-2xl font-bold text-zinc-900">Gift Cards</h1>
        </div>
        <Button onClick={() => setShowCreate(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> New Gift Card
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Total Issued</p>
          <p className="text-2xl font-bold text-zinc-900">{cards.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{active.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Total Value</p>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(cards.reduce((a, c) => a + c.initial_balance, 0))}</p>
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <p className="text-sm text-zinc-500">Remaining</p>
          <p className="text-2xl font-bold text-zinc-900">{formatCurrency(cards.reduce((a, c) => a + c.remaining_balance, 0))}</p>
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Create Gift Card</h2>
              <button onClick={() => setShowCreate(false)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1">Code</label>
                <div className="flex gap-2">
                  <Input value={generatedCode} onChange={e => setGeneratedCode(e.target.value.toUpperCase())} className="font-mono tracking-wider" />
                  <Button variant="outline" size="sm" onClick={() => setGeneratedCode(randomCode())} title="Regenerate">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1">Value ($)</label>
                <Input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-700 block mb-1">Expires (optional)</label>
                <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <Button className="w-full" onClick={createCard} disabled={creating}>
                {creating ? 'Creating...' : 'Create Gift Card'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active cards */}
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Active ({active.length})</h2>
      <div className="space-y-3 mb-8">
        {active.length === 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 p-6 text-center text-zinc-400 text-sm">
            No active gift cards yet.
          </div>
        )}
        {active.map(card => (
          <div key={card.id} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Gift className="h-5 w-5 text-zinc-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono font-semibold text-zinc-900 tracking-wider">{card.code}</span>
                <button onClick={() => copyCode(card.id, card.code)} className="text-zinc-400 hover:text-zinc-600">
                  {copiedId === card.id ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-500">
                <span>{formatCurrency(card.remaining_balance)} / {formatCurrency(card.initial_balance)}</span>
                {card.expires_at && <span>Expires {card.expires_at}</span>}
              </div>
              <div className="mt-1.5 w-full bg-zinc-100 rounded-full h-1.5">
                <div
                  className="bg-zinc-700 h-1.5 rounded-full"
                  style={{ width: `${(card.remaining_balance / card.initial_balance) * 100}%` }}
                />
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => deactivate(card.id)} className="text-red-500 border-red-200 hover:bg-red-50 flex-shrink-0">
              Deactivate
            </Button>
          </div>
        ))}
      </div>

      {/* Inactive cards */}
      {inactive.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">Inactive ({inactive.length})</h2>
          <div className="space-y-3">
            {inactive.map(card => (
              <div key={card.id} className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 flex items-center gap-4 opacity-60">
                <div className="w-10 h-10 bg-zinc-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Gift className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-mono font-semibold text-zinc-500 tracking-wider">{card.code}</span>
                  <div className="text-sm text-zinc-400">
                    {formatCurrency(card.remaining_balance)} remaining · Issued {new Date(card.created_at).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-xs bg-zinc-200 text-zinc-500 px-2 py-1 rounded-full flex-shrink-0">Inactive</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
