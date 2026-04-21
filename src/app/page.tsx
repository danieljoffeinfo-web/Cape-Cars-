'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Nav from '@/components/nav'
import Footer from '@/components/footer'
import { Glass, GlassDark } from '@/components/glass'
import { Icon } from '@/components/icon'

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [blurAmt, setBlurAmt] = useState(1)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t))
    const easeInOut = (x: number) => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
    let raf: number
    const tick = () => {
      const t = v.currentTime
      let amt: number
      if (t <= 1.02)      amt = 1
      else if (t <= 1.85) amt = lerp(1, 0, easeInOut((t - 1.02) / (1.85 - 1.02)))
      else if (t <= 3.35) amt = 0
      else if (t <= 4.0)  amt = lerp(0, 1, easeInOut((t - 3.35) / (4.0 - 3.35)))
      else                amt = 1
      setBlurAmt(amt)
    }
    const loop = () => { tick(); raf = requestAnimationFrame(loop) }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="relative">
      <Nav active="home" />

      {/* ── HERO ── */}
      <section className="relative h-screen w-full overflow-visible">
        <svg className="absolute w-0 h-0" aria-hidden>
          <defs>
            <filter id="motion-smear" x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={`${(blurAmt * 1.8).toFixed(2)} ${(blurAmt * 0.25).toFixed(2)}`}
              />
            </filter>
          </defs>
        </svg>

        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          disablePictureInPicture
          poster="https://res.cloudinary.com/dmanxetyl/video/upload/so_0,q_auto:good,w_900/v1776727486/VID_2_yts0zv.jpg"
          style={{
            objectPosition: 'center 40%',
            filter: 'contrast(1.12) saturate(1.15) brightness(1.04)',
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        >
          {/* Mobile-first: H.264 MP4 (iOS Safari can't decode VP9/WebM) capped at 900px */}
          <source
            src="https://res.cloudinary.com/dmanxetyl/video/upload/q_auto:good,vc_h264,w_900/v1776727486/VID_2_yts0zv.mp4"
            type='video/mp4; codecs="avc1.640028"'
            media="(max-width: 767px)"
          />
          {/* Desktop: VP9 WebM full quality */}
          <source
            src="https://res.cloudinary.com/dmanxetyl/video/upload/q_100,vc_vp9/v1776727486/VID_2_yts0zv.webm"
            type='video/webm; codecs="vp9"'
          />
          {/* Desktop: H.264 fallback */}
          <source
            src="https://res.cloudinary.com/dmanxetyl/video/upload/q_100,vc_h264/v1776727486/VID_2_yts0zv.mp4"
            type='video/mp4; codecs="avc1.640028"'
          />
        </video>

        {/* Liquid-glass pane */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          style={{
            backdropFilter: `saturate(${115 + blurAmt * 5}%) brightness(${0.86 + (1 - blurAmt) * 0.06}) url(#motion-smear)`,
            WebkitBackdropFilter: `saturate(${115 + blurAmt * 5}%) brightness(${0.86 + (1 - blurAmt) * 0.06}) url(#motion-smear)`,
            background: 'linear-gradient(135deg, rgba(10,10,12,0.28) 0%, rgba(20,20,24,0.18) 45%, rgba(10,10,12,0.25) 100%)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18),inset 0 -1px 0 rgba(0,0,0,0.25)',
          }}
        >
          <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(120% 60% at 15% 0%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 55%)', mixBlendMode: 'screen' }} />
          <span aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(80% 40% at 100% 100%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%)' }} />
        </div>

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(130% 90% at 70% 40%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 70%, rgba(0,0,0,0.7) 100%)' }} />
        <div className="absolute inset-0 grain pointer-events-none" />

        <div className="relative h-full max-w-7xl mx-auto px-6 md:px-10 pt-28 pb-4 md:pb-0 flex flex-col justify-between">
          {/* Top-right badge */}
          <div className="hidden md:flex justify-end">
            <Glass className="rounded-full px-4 py-2 flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase text-white/85">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              Bay 14 · now open
            </Glass>
          </div>

          {/* Bottom row */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <Glass className="rounded-2xl px-5 py-5 md:px-7 md:py-7 max-w-md hero-glass-lighter md:translate-y-[35%] relative z-10">
              <h1 className="text-[clamp(1.6rem,4.2vw,3.4rem)] font-light leading-[0.98] tracking-tight">
                The keys,<br />
                <span className="text-white/85">are yours today.</span>
              </h1>
              <p className="mt-2 md:mt-4 text-white/75 text-sm md:text-[15px] max-w-sm leading-relaxed font-light hidden sm:block">
                A members&apos; garage of track‑prepared cars, rented by the afternoon.
              </p>
              <div className="mt-4 md:mt-6 flex flex-wrap items-center gap-2.5">
                <Link href="/fleet" className="group inline-flex items-center gap-2 pl-4 pr-1 py-1 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors">
                  Browse fleet
                  <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <Icon.arrow width={12} height={12} />
                  </span>
                </Link>
                <Link href="/services" className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/25 text-white/90 hover:bg-white/10 transition-colors text-sm">
                  <Icon.play width={10} height={10} />
                  How it works
                </Link>
              </div>
            </Glass>

            {/* Featured car chip */}
            <Glass className="hidden md:block rounded-2xl px-5 py-4 w-72">
              <div className="flex items-center justify-between text-[10px] tracking-[0.3em] uppercase text-white/60">
                <span>Now featured</span>
                <span className="text-white/90">R 38,000/day</span>
              </div>
              <div className="mt-2 text-white font-medium">Porsche 911 GT3</div>
              <div className="text-white/65 text-xs mt-0.5">4.0L flat‑six · 502 hp · Shark Blue</div>
              <div className="mt-3 h-px bg-white/15" />
              <div className="mt-3 flex items-center justify-between text-[11px] text-white/60">
                <span>Available today</span>
                <Link href="/contact" className="inline-flex items-center gap-1 text-white/90 hover:text-white">
                  Reserve <Icon.arrow width={11} height={11} />
                </Link>
              </div>
            </Glass>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <section className="border-y border-black/[0.08] bg-[#ebe7dd] overflow-hidden">
        <div className="marquee-track flex gap-14 whitespace-nowrap py-6 text-[13px] tracking-[0.25em] uppercase text-neutral-500">
          {[...Array(2)].flatMap((_, i) =>
            ['Porsche', '· 911 GT3', '· Taycan Turbo', '· Cayman GT4',
             'McLaren', '· 720S', 'Lamborghini', '· Huracán STO',
             'Aston Martin', '· DB12', 'Ferrari', '· 296 GTB',
             'BMW', '· M4 CSL', 'Mercedes-AMG', '· GT Black Series',
            ].map((s, j) => <span key={`${i}-${j}`}>{s}</span>)
          )}
        </div>
      </section>

      {/* ── VALUE PROPOSITION ── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-28 md:py-36">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16">
          <div className="md:col-span-5">
            <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-500">Why us</div>
            <h2 className="mt-4 text-4xl md:text-5xl font-light leading-tight tracking-tight text-neutral-900">
              Not a rental. <br />
              <span className="italic text-neutral-500">A proving ground.</span>
            </h2>
          </div>
          <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { k: '01', t: 'Keys in 6 minutes',      b: 'Digital check-in. No counters, no photocopies, no waiting.' },
              { k: '02', t: 'Priced by the hour',      b: 'Three hours, a day, a weekend. Pay for the time you drive.' },
              { k: '03', t: 'Track day included',      b: 'Members drive Killarney Raceway once a quarter on us.' },
              { k: '04', t: 'Every car, hand‑prepped', b: 'Factory-trained mechanics. Fresh tyres every 2,000 km.' },
            ].map(c => (
              <GlassDark key={c.k} className="rounded-2xl p-6">
                <div className="text-[11px] tracking-[0.3em] uppercase text-white/50">{c.k}</div>
                <div className="mt-3 text-white font-medium">{c.t}</div>
                <p className="mt-2 text-sm text-white/65 leading-relaxed">{c.b}</p>
              </GlassDark>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURED CARS ── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-28">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-500">In the bay</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-light tracking-tight text-neutral-900">This week&apos;s lineup</h2>
          </div>
          <Link href="/fleet" className="hidden md:inline-flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900">
            See all 11 <Icon.arrowUR width={14} height={14} />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { m: 'Porsche 911 GT3',   p: 'R 38,000', tag: 'Track-prepped' },
            { m: 'McLaren 720S',      p: 'R 49,000', tag: 'Concierge only' },
            { m: 'Aston Martin DB12', p: 'R 30,000', tag: 'Grand tourer' },
          ].map(c => (
            <GlassDark key={c.m} className="rounded-2xl overflow-hidden group cursor-pointer">
              <div className="aspect-[4/3] relative bg-gradient-to-br from-white/[0.06] to-white/[0.02] overflow-hidden">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 18px)' }} />
                <div className="absolute top-4 left-4 text-[10px] tracking-[0.25em] uppercase text-white/70 border border-white/20 rounded-full px-2.5 py-1 bg-black/40 backdrop-blur-sm">
                  {c.tag}
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-white/30 font-mono text-xs tracking-wider uppercase">
                  {c.m} photo
                </div>
                <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white text-black grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon.arrowUR width={14} height={14} />
                </div>
              </div>
              <div className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-white">{c.m}</div>
                  <div className="text-xs text-white/55 mt-0.5">Available today · Cape Town</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/55">From</div>
                  <div className="text-white tabular-nums font-medium">{c.p}/day</div>
                </div>
              </div>
            </GlassDark>
          ))}
        </div>
      </section>

      {/* ── CTA BAND ── */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
        <GlassDark className="rounded-3xl overflow-hidden">
          <div className="relative p-10 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-[11px] tracking-[0.3em] uppercase text-white/50">Membership</div>
              <h2 className="mt-4 text-3xl md:text-5xl font-light leading-tight text-white">
                Four drives a year. <br /><span className="italic text-white/60">One flat rate.</span>
              </h2>
              <p className="mt-4 text-white/60 max-w-md font-light">
                R 135,000 a year. Reserve any car, any weekend. Includes a quarterly track day at Killarney Raceway.
              </p>
              <Link
                href="/services"
                className="mt-8 inline-flex items-center gap-2 pl-5 pr-1 py-1 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors"
              >
                See membership
                <span className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center">
                  <Icon.arrow width={14} height={14} />
                </span>
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Annual drives', '4'],
                ['Featured cars', '11'],
                ['Track days', '4 / yr'],
                ['Average booking', '5 hr'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl border border-white/[0.09] p-5 bg-white/[0.03]">
                  <div className="text-[10px] tracking-[0.3em] uppercase text-white/50">{k}</div>
                  <div className="mt-2 text-3xl font-light tabular-nums text-white">{v}</div>
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
