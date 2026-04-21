'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Glass, GlassDark } from './glass'
import { Icon } from './icon'

const NAV_ITEMS = [
  { label: 'Fleet',    href: '/fleet' },
  { label: 'Services', href: '/services' },
  { label: 'Contact',  href: '/contact' },
]

export default function Nav({ active, theme = 'light' }: { active: string; theme?: 'light' | 'dark-on-white' }) {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const darkNav = theme === 'dark-on-white' || scrolled
  const Shell = darkNav ? GlassDark : Glass

  return (
    <header className="fixed top-0 inset-x-0 z-40 px-4 md:px-6 pt-4 md:pt-5">
      <Shell className="mx-auto max-w-7xl rounded-2xl transition-all duration-500">
        <div className="flex items-center justify-between px-5 md:px-7 py-3.5">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/cape-cars-logo.png"
              alt="Cape Cars"
              width={120}
              height={48}
              className="object-contain h-10 w-auto brightness-0 invert"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <ul className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const isActive = active === item.label.toLowerCase()
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`px-4 py-2 rounded-full text-sm transition-colors ${
                      isActive
                        ? 'text-white bg-white/10'
                        : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/contact" className="text-sm text-white/60 hover:text-white transition-colors">
              Reserve
            </Link>
            <Link
              href="/fleet"
              className="group flex items-center gap-2 pl-4 pr-1 py-1 rounded-full text-sm font-medium transition-colors bg-white text-black hover:bg-white/90"
            >
              Browse fleet
              <span className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <Icon.arrow width={12} height={12} />
              </span>
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden w-10 h-10 grid place-items-center text-white"
            onClick={() => setOpen(o => !o)}
            aria-label="Menu"
          >
            {open ? <Icon.x width={20} height={20} /> : <Icon.menu width={20} height={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="md:hidden px-5 py-4 space-y-1 border-t border-white/[0.08]">
            {NAV_ITEMS.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2.5 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.08]"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/fleet"
              className="block mt-3 text-center px-4 py-3 rounded-full font-medium bg-white text-black hover:bg-white/90"
              onClick={() => setOpen(false)}
            >
              Browse fleet
            </Link>
          </div>
        )}
      </Shell>
    </header>
  )
}
