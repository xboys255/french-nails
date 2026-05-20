import { createClient } from '@/lib/supabase/server'
import { getLocale } from 'next-intl/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/shared/Navbar'
import { Star, TrendingUp, Gift, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { POINTS_PER_DOLLAR, POINTS_REDEMPTION_RATE } from '@/lib/utils'

export default async function LoyaltyPage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/auth/login`)

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()

  const { data: loyalty } = await supabase
    .from('loyalty_accounts')
    .select('*')
    .eq('client_id', user.id)
    .single()

  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const points = loyalty?.points ?? 0
  const dollarValue = (points / POINTS_REDEMPTION_RATE).toFixed(2)
  const totalEarned = loyalty?.total_earned ?? 0
  const totalRedeemed = loyalty?.total_redeemed ?? 0

  // Progress to next reward tier (every 1000 pts = next $10 reward)
  const tierSize = 1000
  const progressPct = Math.min((points % tierSize) / tierSize * 100, 100)
  const ptsToNextTier = tierSize - (points % tierSize)

  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar role="client" userName={profile?.full_name} />
      <div className="mx-auto max-w-2xl px-4 py-10">

        <div className="mb-8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1">My Account</p>
          <h1
            className="text-2xl font-light text-zinc-900 tracking-tight"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            Rewards
          </h1>
        </div>

        {/* Balance card */}
        <div className="bg-zinc-900 rounded-[22px] p-7 mb-5 text-white">
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-4">Available points</p>
          <p
            className="text-5xl font-light tracking-tight mb-1"
            style={{ fontFamily: 'var(--font-cormorant), serif' }}
          >
            {points.toLocaleString()}
          </p>
          <p className="text-sm text-zinc-400">≈ ${dollarValue} off your next visit</p>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex justify-between text-[10px] text-zinc-500 mb-2">
              <span>{points % tierSize} / {tierSize} pts to next tier</span>
              <span>{ptsToNextTier} more</span>
            </div>
            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <Link
            href={`/${locale}/book`}
            className="mt-6 inline-flex items-center gap-2 bg-white text-zinc-900 text-xs tracking-widest uppercase font-medium px-5 py-2.5 rounded-full hover:bg-zinc-100 transition-colors"
          >
            Use at checkout <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { icon: TrendingUp, label: 'Total Earned', value: totalEarned.toLocaleString() + ' pts' },
            { icon: Gift, label: 'Total Redeemed', value: totalRedeemed.toLocaleString() + ' pts' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white border border-zinc-100 rounded-2xl p-5">
              <Icon className="h-4 w-4 text-zinc-400 mb-3" />
              <p className="text-lg font-light text-zinc-900" style={{ fontFamily: 'var(--font-cormorant), serif' }}>{value}</p>
              <p className="text-[10px] tracking-[0.15em] uppercase text-zinc-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 mb-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-4">How it works</p>
          <div className="space-y-4">
            {[
              { n: '01', text: `Earn ${POINTS_PER_DOLLAR} points for every $1 spent` },
              { n: '02', text: `${POINTS_REDEMPTION_RATE} points = $1 off your next booking` },
              { n: '03', text: 'Points are applied automatically at checkout' },
              { n: '04', text: 'Points never expire as long as your account is active' },
            ].map(({ n, text }) => (
              <div key={n} className="flex items-start gap-4">
                <span className="text-[10px] tracking-[0.15em] text-zinc-300 font-medium flex-shrink-0 mt-0.5">{n}</span>
                <p className="text-sm text-zinc-600">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction history */}
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-3">History</p>
          {!transactions?.length ? (
            <div className="bg-white border border-zinc-100 rounded-2xl p-8 text-center">
              <Star className="h-6 w-6 text-zinc-200 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No transactions yet.</p>
              <p className="text-xs text-zinc-300 mt-1">Book your first appointment to start earning.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between bg-white border border-zinc-100 rounded-xl px-5 py-4">
                  <div>
                    <p className="text-sm text-zinc-900">{tx.description}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`text-sm font-medium ${tx.type === 'earned' ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {tx.type === 'earned' ? '+' : '−'}{tx.points.toLocaleString()} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
