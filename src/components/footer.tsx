import Link from 'next/link'
import Image from 'next/image'
import { Icon } from './icon'

const NAV_ITEMS = [
  { label: 'Fleet',     href: '/fleet' },
  { label: 'Services',  href: '/services' },
  { label: 'Contact',   href: '/contact' },
]

export default function Footer() {
  return (
    <footer className="relative mt-32 border-t border-black/[0.08] bg-[#efece5]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <Image src="/cape-cars-logo.png" alt="Cape Cars" width={220} height={88} className="object-contain h-20 w-auto" />
          <p className="mt-2 text-sm tracking-[0.15em] uppercase text-neutral-500">Cape Cars</p>
          <h3 className="mt-4 text-3xl md:text-4xl font-light text-neutral-900 leading-tight max-w-md">
            Where the keys are yours for the day.
          </h3>
          <Link href="/contact"
            className="mt-8 inline-flex items-center gap-2 text-sm text-neutral-900/80 hover:text-neutral-900">
            Book your drive
            <Icon.arrowUR width={14} height={14} />
          </Link>
        </div>
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-500">Explore</div>
          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            {NAV_ITEMS.map(i => (
              <li key={i.href}>
                <Link href={i.href} className="hover:text-neutral-900">{i.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-500">Visit</div>
          <ul className="mt-4 space-y-2 text-sm text-neutral-700">
            <li>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Killarney+Raceway+Cape+Town"
                target="_blank"
                rel="noopener"
                className="hover:text-neutral-900 inline-flex items-start gap-1.5 group"
              >
                <span>Killarney Raceway<br/>Potsdam Rd, Cape Town 7441</span>
                <Icon.arrowUR width={11} height={11} className="opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
              </a>
            </li>
            <li className="pt-2 text-neutral-500">Mon–Sun · 8am–8pm</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-black/[0.06]">
        <div className="max-w-7xl mx-auto px-6 md:px-10 py-6 flex items-center justify-between text-[11px] tracking-[0.2em] uppercase text-neutral-500">
          <span>© 2026 Cape Cars</span>
          <span>Est. 2024 · Cape Town</span>
        </div>
      </div>
    </footer>
  )
}
