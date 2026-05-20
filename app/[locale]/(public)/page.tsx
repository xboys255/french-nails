import Link from 'next/link'
import { getLocale } from 'next-intl/server'
import { ArrowRight } from 'lucide-react'
import Navbar from '@/components/shared/Navbar'
import { LogoMark } from '@/components/shared/Logo'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar role={profile?.role ?? null} userName={profile?.full_name ?? null} />

      {/* ── Hero ── */}
      <section className="px-4 pt-20 pb-16 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left: copy */}
            <div>
              <div className="inline-flex items-center gap-2 border border-zinc-200 rounded-full px-4 py-1.5 mb-10">
                <span className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 font-medium">
                  Premium Nail Studio
                </span>
              </div>

              <h1
                className="text-[clamp(3rem,8vw,5.5rem)] font-light leading-[1.02] tracking-[-0.02em] text-zinc-900 mb-8"
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
              >
                Nails that<br />
                <em>speak</em><br />
                for you.
              </h1>

              <p className="text-base text-zinc-500 leading-relaxed mb-10 max-w-sm">
                Precision nail care by skilled artisans. Book your appointment in seconds, walk out feeling perfect.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={`/${locale}/book`}
                  className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-7 py-3.5 rounded-full hover:bg-zinc-700 transition-colors"
                >
                  Book Now
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href={`/${locale}#services`}
                  className="text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 underline underline-offset-4 transition-colors"
                >
                  Our Services
                </Link>
              </div>
            </div>

            {/* Right: media card */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-sm lg:max-w-full">
                {/* Main card */}
                <div className="bg-stone-100 rounded-[22px] aspect-[3/4] w-full relative overflow-hidden">
                  {/* Background gem watermark */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <LogoMark className="w-28 h-36 text-stone-300" color="#d4cfc8" />
                  </div>

                  {/* Ambient gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-200/60 to-transparent" />

                  {/* Floating availability panel */}
                  <div className="absolute bottom-5 left-5 right-5 bg-zinc-900/95 backdrop-blur-sm rounded-[14px] p-5">
                    <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-1.5">
                      Next available
                    </div>
                    <div className="text-white text-sm font-medium mb-0.5">Today · 2:30 PM</div>
                    <div className="text-zinc-400 text-xs">Classic Manicure · 45 min</div>
                    <Link
                      href={`/${locale}/book`}
                      className="mt-4 flex items-center justify-between text-xs text-zinc-300 hover:text-white transition-colors"
                    >
                      <span className="tracking-widest uppercase">Book this slot</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Floating stat badge */}
                <div className="absolute -top-4 -right-4 bg-white border border-zinc-100 rounded-2xl shadow-sm px-5 py-3 hidden md:block">
                  <div className="text-[10px] tracking-widest uppercase text-zinc-400 mb-0.5">Rating</div>
                  <div className="text-zinc-900 text-sm font-medium" style={{ fontFamily: "var(--font-cormorant), serif" }}>
                    5.0 ★ Excellence
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="border-y border-zinc-100 py-5 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 sm:gap-0 text-[11px] tracking-[0.15em] uppercase text-zinc-400">
            <span className="sm:px-10">Open 7 Days · 9am–7pm</span>
            <span className="hidden sm:block w-px h-4 bg-zinc-200" />
            <span className="sm:px-10">Sterilized Tools Every Visit</span>
            <span className="hidden sm:block w-px h-4 bg-zinc-200" />
            <span className="sm:px-10">100% Satisfaction Guaranteed</span>
          </div>
        </div>
      </div>

      {/* ── Capabilities ── */}
      <section className="px-4 py-24" id="services">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-400 mb-5">Why choose us</div>
              <h2
                className="text-[clamp(2rem,5vw,3.5rem)] font-light tracking-tight leading-tight text-zinc-900 max-w-lg"
                style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
              >
                Everything you need,<br />
                nothing you don't.
              </h2>
            </div>
            <Link
              href={`/${locale}/book`}
              className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 underline underline-offset-4 transition-colors self-start md:self-auto"
            >
              Book an appointment <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-100 border-t border-zinc-100">
            {[
              {
                num: '01',
                title: 'Expert Artisans',
                desc: 'Our nail technicians are trained to the highest standard, delivering flawless results with every visit.',
              },
              {
                num: '02',
                title: 'Instant Booking',
                desc: 'Book 24/7 from any device. Automatic confirmations and reminders keep you on schedule.',
              },
              {
                num: '03',
                title: 'Loyalty Rewards',
                desc: 'Earn points with every appointment and redeem them for complimentary services and upgrades.',
              },
            ].map((f) => (
              <div key={f.num} className="py-10 md:px-10 first:pl-0 last:pr-0">
                <div
                  className="text-[10px] tracking-[0.2em] uppercase text-zinc-300 mb-6"
                  style={{ fontFamily: "var(--font-cormorant), serif" }}
                >
                  {f.num}
                </div>
                <h3 className="text-lg font-medium text-zinc-900 mb-3">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services band ── */}
      <section className="px-4 pb-8">
        <div className="mx-auto max-w-7xl">
          <div className="bg-stone-50 rounded-[22px] px-8 py-14 md:px-16 md:py-20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
              {[
                { name: 'Classic Manicure', from: 'From $25' },
                { name: 'Gel Overlay', from: 'From $45' },
                { name: 'Pedicure', from: 'From $35' },
                { name: 'Nail Art', from: 'From $55' },
              ].map((s) => (
                <div key={s.name} className="border-t border-zinc-200 pt-5">
                  <div className="text-sm font-medium text-zinc-800 mb-1">{s.name}</div>
                  <div className="text-xs text-zinc-400 tracking-wide">{s.from}</div>
                </div>
              ))}
            </div>
            <Link
              href={`/${locale}/book`}
              className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs tracking-widest uppercase font-medium px-7 py-3.5 rounded-full hover:bg-zinc-700 transition-colors"
            >
              See All Services & Book
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Dark CTA band ── */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="bg-zinc-900 rounded-[22px] px-8 py-16 md:px-16 md:py-20">
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-10">
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-500 mb-6">Ready to book</div>
                <h2
                  className="text-[clamp(2.5rem,6vw,4.5rem)] font-light tracking-tight leading-[1.0] text-white"
                  style={{ fontFamily: "var(--font-cormorant), Georgia, serif" }}
                >
                  Your perfect<br />
                  <em>appointment</em><br />
                  awaits.
                </h2>
              </div>
              <div className="flex flex-col items-start md:items-end gap-5 flex-shrink-0">
                <p className="text-sm text-zinc-400 max-w-xs md:text-right leading-relaxed">
                  Pick your service, nail tech, and time — done in under 60 seconds.
                </p>
                <Link
                  href={`/${locale}/book`}
                  className="inline-flex items-center gap-2 bg-white text-zinc-900 text-xs tracking-widest uppercase font-medium px-7 py-3.5 rounded-full hover:bg-zinc-100 transition-colors"
                >
                  Book Now
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-zinc-900 text-white px-4 pt-16 pb-10 mt-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row justify-between gap-12 mb-16">

            {/* Brand */}
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-5">
                <LogoMark className="h-8 w-7 text-white" color="white" />
                <span
                  className="text-sm font-light tracking-[0.22em] uppercase text-white"
                  style={{ fontFamily: "var(--font-cormorant), serif" }}
                >
                  French Nails
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Premium nail care crafted with precision, artistry, and care — every single time.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-col sm:flex-row gap-12">
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-600 mb-5">Hours</div>
                <div className="space-y-1.5 text-xs text-zinc-400">
                  <p>Mon – Sat · 9:00 am – 7:00 pm</p>
                  <p>Sunday · 10:00 am – 5:00 pm</p>
                </div>
              </div>
              <div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-zinc-600 mb-5">Navigation</div>
                <div className="flex flex-col gap-2.5 text-xs text-zinc-400">
                  <Link href={`/${locale}/book`} className="hover:text-white transition-colors">
                    Book Appointment
                  </Link>
                  <Link href={`/${locale}/auth/login`} className="hover:text-white transition-colors">
                    Sign In
                  </Link>
                  <Link href={`/${locale}#services`} className="hover:text-white transition-colors">
                    Services
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-zinc-600 tracking-wide">
            <span>© {new Date().getFullYear()} French Nails. All rights reserved.</span>
            <span className="tracking-[0.15em] uppercase text-zinc-700">Elegance in every detail</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
