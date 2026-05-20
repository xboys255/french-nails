'use client'

import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Logo from './Logo'

interface NavbarProps {
  role?: 'client' | 'staff' | 'admin' | null
  userName?: string | null
}

export default function Navbar({ role, userName }: NavbarProps) {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}`)
    router.refresh()
  }

  const links = role === 'admin'
    ? [{ href: `/${locale}/admin`, label: t('admin.title') }]
    : role === 'staff'
    ? [
        { href: `/${locale}/staff`, label: t('staff.title') },
        { href: `/${locale}/staff/calendar`, label: 'Calendar' },
      ]
    : role === 'client'
    ? [
        { href: `/${locale}/book`, label: t('nav.book') },
        { href: `/${locale}/client/appointments`, label: t('nav.myAppointments') },
        { href: `/${locale}/client/loyalty`, label: t('nav.loyalty') },
        { href: `/${locale}/client/profile`, label: t('nav.profile') },
      ]
    : [
        { href: `/${locale}/book`, label: t('nav.book') },
        { href: `/${locale}#services`, label: t('nav.services') },
      ]

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-zinc-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-8">

          {/* Logo */}
          <Link href={`/${locale}`} className="flex-shrink-0">
            <Logo />
          </Link>

          {/* Desktop center nav */}
          <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            {role ? (
              <div className="flex items-center gap-4">
                {userName && (
                  <span className="text-xs text-zinc-400 tracking-wide">{userName}</span>
                )}
                <button
                  onClick={handleSignOut}
                  className="text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  {t('nav.signOut')}
                </button>
              </div>
            ) : (
              <Link
                href={`/${locale}/auth/login`}
                className="inline-flex items-center text-xs tracking-widest uppercase font-medium bg-zinc-900 text-white px-5 py-2.5 rounded-full hover:bg-zinc-700 transition-colors"
              >
                {t('nav.signIn')}
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 -mr-1 rounded-lg text-zinc-600 hover:bg-zinc-50 touch-manipulation"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t border-zinc-100 bg-white px-6 pt-4 pb-6">
          <div className="flex flex-col gap-4">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 py-1"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-zinc-100">
              {role ? (
                <div className="flex items-center justify-between">
                  {userName && <span className="text-xs text-zinc-400">{userName}</span>}
                  <button
                    onClick={handleSignOut}
                    className="text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900"
                  >
                    {t('nav.signOut')}
                  </button>
                </div>
              ) : (
                <Link
                  href={`/${locale}/auth/login`}
                  className="inline-flex items-center text-xs tracking-widest uppercase font-medium bg-zinc-900 text-white px-5 py-2.5 rounded-full"
                  onClick={() => setOpen(false)}
                >
                  {t('nav.signIn')}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
