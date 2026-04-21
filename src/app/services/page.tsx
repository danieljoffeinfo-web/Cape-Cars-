import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { GlassDark } from '@/components/glass'
import { Icon } from '@/components/icon'

export const metadata = { title: 'Services — Car Demo' }

const TIERS = [
  {
    name: 'Afternoon',
    blurb: 'Keys by noon, back by six.',
    price: 'From R 12,000',
    per: '/ half-day',
    popular: false,
    features: ['4-hour drive window', 'Choice of Daily-tier car', '160 km allowance', 'Full insurance included', 'Digital check-in'],
  },
  {
    name: 'Members',
    blurb: 'Four drives a year, any car.',
    price: 'R 135,000',
    per: '/ year',
    popular: true,
    features: ['4 drives annually, any tier', 'Unlimited mileage on drives', 'Quarterly track day · Killarney Raceway', 'Guest day (bring a friend)', 'Priority booking · 14-day window', 'Dedicated concierge'],
  },
  {
    name: 'Concierge',
    blurb: 'Your car, your terms, delivered.',
    price: 'From R 38,000',
    per: '/ day',
    popular: false,
    features: ['Any car in the fleet', 'Delivery within 60 km', 'Personal driver on request', 'Multi-day routing & support', 'Event & film rate available'],
  },
]

const ADDONS = [
  { t: 'Detailing',      p: 'R 2,800', b: 'Hand wash, ceramic maintenance, leather conditioning.' },
  { t: 'Track coaching', p: 'R 7,200', b: 'One-on-one with a Killarney-certified instructor.' },
  { t: 'Helmet & suit',  p: 'R 950',   b: 'Snell-rated loaner gear for track days.' },
  { t: 'Photography',    p: 'R 9,500', b: 'A photographer follows your drive for three hours.' },
]

export default function ServicesPage() {
  return (
    <div>
      <Nav active="services" theme="dark-on-white" />

      {/* Header */}
      <section className="pt-32 md:pt-40 pb-12 border-b border-black/[0.08]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-500">Services</div>
          <h1 className="mt-4 text-5xl md:text-7xl font-light leading-[0.95] tracking-tight max-w-4xl text-neutral-900">
            Three ways <br /><span className="italic text-neutral-500">to take the keys.</span>
          </h1>
          <p className="mt-6 max-w-xl text-neutral-600 font-light">
            Priced by the hour, the day, or the year. Insurance, fuel, and cleanup are always included.
          </p>
        </div>
      </section>

      {/* Tiers */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TIERS.map(t => {
            const isDark = t.popular
            return (
              <div
                key={t.name}
                className={`rounded-3xl p-8 flex flex-col border ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-900 text-white'
                    : 'bg-white border-black/[0.06] text-neutral-900'
                }`}
              >
                {t.popular && (
                  <div className="self-start text-[10px] tracking-[0.3em] uppercase px-2.5 py-1 rounded-full bg-white text-neutral-900 mb-5">
                    Most popular
                  </div>
                )}
                <div className={`text-xs tracking-[0.25em] uppercase ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>{t.name}</div>
                <div className={`mt-3 text-2xl font-light ${isDark ? 'text-white' : 'text-neutral-900'}`}>{t.blurb}</div>
                <div className="mt-8 flex items-end gap-2">
                  <div className={`text-5xl font-light tabular-nums ${isDark ? 'text-white' : 'text-neutral-900'}`}>{t.price}</div>
                  <div className={`pb-2 ${isDark ? 'text-white/60' : 'text-neutral-500'}`}>{t.per}</div>
                </div>
                <ul className="mt-8 space-y-3 flex-1">
                  {t.features.map(f => (
                    <li key={f} className={`flex items-start gap-3 text-sm ${isDark ? 'text-white/85' : 'text-neutral-700'}`}>
                      <span className={`shrink-0 mt-0.5 w-5 h-5 rounded-full grid place-items-center ${isDark ? 'bg-white/10 text-white' : 'bg-neutral-100 text-neutral-700'}`}>
                        <Icon.check width={11} height={11} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/contact"
                  className={`mt-10 inline-flex items-center justify-center gap-2 py-3 rounded-full text-sm font-medium transition-colors ${
                    isDark
                      ? 'bg-white text-neutral-900 hover:bg-white/90'
                      : 'bg-neutral-900 text-white hover:bg-neutral-800'
                  }`}
                >
                  Get started
                  <Icon.arrow width={13} height={13} />
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* Add-ons */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-20">
        <div className="mb-8">
          <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-500">Extras</div>
          <h2 className="mt-3 text-3xl md:text-4xl font-light tracking-tight text-neutral-900">Add it to your drive</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ADDONS.map(a => (
            <div key={a.t} className="rounded-2xl p-6 flex flex-col bg-white border border-black/[0.06]">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-full bg-neutral-100 grid place-items-center text-neutral-700">
                  <Icon.plus width={14} height={14} />
                </div>
                <div className="text-neutral-900 tabular-nums">{a.p}</div>
              </div>
              <div className="mt-6 text-neutral-900 font-medium">{a.t}</div>
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed flex-1">{a.b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-28">
        <GlassDark className="rounded-3xl p-10 md:p-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <div className="text-[11px] tracking-[0.3em] uppercase text-white/50">How it works</div>
              <h2 className="mt-3 text-3xl md:text-4xl font-light tracking-tight text-white">
                Four steps, <br /><span className="italic text-white/60">no paperwork.</span>
              </h2>
            </div>
            <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                { n: '01', t: 'Reserve', b: 'Pick your car and window online. Pay a refundable hold.' },
                { n: '02', t: 'Verify',  b: 'Upload your license. Approved in under ten minutes.' },
                { n: '03', t: 'Collect', b: 'Arrive at Bay 14. Keys ready, car warm, espresso waiting.' },
                { n: '04', t: 'Return',  b: 'Drop the keys in the lockbox. Receipt in your inbox.' },
              ].map(s => (
                <div key={s.n} className="border-t border-white/[0.12] pt-5">
                  <div className="text-[11px] tracking-[0.3em] uppercase text-white/50">{s.n}</div>
                  <div className="mt-2 text-white font-medium">{s.t}</div>
                  <p className="mt-1 text-sm text-white/65 leading-relaxed">{s.b}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassDark>
      </section>

      <Footer />
    </div>
  )
}
