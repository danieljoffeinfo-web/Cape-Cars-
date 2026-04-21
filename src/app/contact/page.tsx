import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { GlassDark } from '@/components/glass'
import { Icon } from '@/components/icon'
import BookingForm from '@/components/booking-form'

export const metadata = { title: 'Contact — Cape Cars' }

const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Killarney+Raceway+Cape+Town'

export default function ContactPage() {
  return (
    <div>
      <Nav active="contact" theme="dark-on-white" />

      <section className="pt-32 md:pt-40 pb-12 border-b border-black/[0.08]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-500">Contact</div>
          <h1 className="mt-4 text-5xl md:text-7xl font-light leading-[0.95] tracking-tight max-w-3xl text-neutral-900">
            Tell us the day. <br /><span className="italic text-neutral-500">We&apos;ll hand you the keys.</span>
          </h1>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Contact info */}
        <div className="lg:col-span-4 space-y-4">
          <a href={MAPS_URL} target="_blank" rel="noopener" className="block rounded-2xl p-6 bg-white border border-black/[0.06] hover:bg-neutral-50 transition-colors">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-neutral-100 grid place-items-center shrink-0 text-neutral-700">
                <Icon.pin width={15} height={15} />
              </div>
              <div>
                <div className="text-neutral-900 font-medium">Killarney Raceway</div>
                <div className="text-sm text-neutral-600 mt-0.5">
                  Potsdam Rd, Killarney<br />Cape Town, 7441 · Open daily, 8am – 8pm
                </div>
                <div className="mt-2 text-[11px] tracking-[0.2em] uppercase text-neutral-500 inline-flex items-center gap-1">
                  Open in maps <Icon.arrowUR width={10} height={10} />
                </div>
              </div>
            </div>
          </a>

          <div className="rounded-2xl p-6 bg-white border border-black/[0.06]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-neutral-100 grid place-items-center shrink-0 text-neutral-700">
                <Icon.phone width={15} height={15} />
              </div>
              <div>
                <div className="text-neutral-900 font-medium">+27 21 555 0142</div>
                <div className="text-sm text-neutral-600 mt-0.5">Concierge line, 24/7</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-6 bg-white border border-black/[0.06]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-neutral-100 grid place-items-center shrink-0 text-neutral-700">
                <Icon.mail width={15} height={15} />
              </div>
              <div>
                <div className="text-neutral-900 font-medium">drive@thedrivingforce.co.za</div>
                <div className="text-sm text-neutral-600 mt-0.5">Typical reply: under an hour</div>
              </div>
            </div>
          </div>

          <GlassDark className="rounded-2xl p-6">
            <div className="text-[11px] tracking-[0.3em] uppercase text-white/50">Today&apos;s window</div>
            <div className="mt-3 flex items-center justify-between">
              <div className="text-white">Available slots</div>
              <div className="text-white tabular-nums font-medium">7 / 11</div>
            </div>
            <div className="mt-3 h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-white" style={{ width: '64%' }} />
            </div>
          </GlassDark>
        </div>

        {/* Form */}
        <div className="lg:col-span-8 rounded-3xl p-8 md:p-10 bg-white border border-black/[0.06]">
          <BookingForm />
        </div>
      </section>

      <Footer />
    </div>
  )
}
