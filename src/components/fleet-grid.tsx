'use client'

import { useState, useMemo } from 'react'
import { GlassDark } from './glass'
import { Icon } from './icon'
import type { Car } from '@/lib/fleet'

const CATS = ['All', 'Track', 'Supercar', 'Grand Tourer', 'Electric', 'Daily']

function FleetCard({ car }: { car: Car }) {
  const bookable = car.status === 'Available'
  return (
    <GlassDark className="rounded-2xl overflow-hidden flex flex-col group">
      {/* Image placeholder */}
      <div className="aspect-[5/4] relative bg-gradient-to-br from-white/[0.08] via-white/[0.03] to-white/[0.02] overflow-hidden">
        <div
          className="absolute inset-0 opacity-35"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 18px)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-white/25 font-mono text-[11px] tracking-wider uppercase">
          {car.model} · {car.color}
        </div>

        {/* Status pill */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white">
          <span className={`w-1.5 h-1.5 rounded-full ${bookable ? 'bg-emerald-400' : car.status === 'Booked' ? 'bg-amber-400' : 'bg-white/40'}`} />
          {car.status}
        </div>

        {/* Category tag */}
        <div className="absolute top-3 right-3 text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/80">
          {car.cat}
        </div>

        {/* Fav */}
        <button className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/50 border border-white/15 backdrop-blur-md grid place-items-center text-white/60 hover:text-white">
          <Icon.heart width={15} height={15} />
        </button>
      </div>

      {/* Card body */}
      <div className="p-5 flex-1 flex flex-col bg-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">Model</div>
            <div className="mt-1 text-neutral-900 font-medium">{car.model}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] tracking-[0.25em] uppercase text-neutral-400">Daily</div>
            <div className="mt-1 text-neutral-900 tabular-nums">R {car.rate.toLocaleString()}</div>
          </div>
        </div>

        {/* Specs */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] text-neutral-600">
          <div className="flex items-center gap-1.5 truncate"><Icon.gauge width={13} height={13} />{car.power}</div>
          <div className="flex items-center gap-1.5 truncate"><Icon.seat  width={13} height={13} />{car.seats} seats</div>
          <div className="flex items-center gap-1.5 truncate"><Icon.fuel  width={13} height={13} />{car.fuel}</div>
        </div>

        <div className="mt-5 flex items-center justify-between pt-4 border-t border-black/10">
          <button className="text-sm text-neutral-500 hover:text-neutral-900">Details</button>
          <button
            disabled={!bookable}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              bookable
                ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                : 'bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed'
            }`}
          >
            {bookable ? 'Reserve' : car.status}
            {bookable && <Icon.arrow width={12} height={12} />}
          </button>
        </div>
      </div>
    </GlassDark>
  )
}

export default function FleetGrid({ cars: initialCars }: { cars: Car[] }) {
  const [cat, setCat] = useState('All')
  const [sort, setSort] = useState('featured')
  const [q, setQ] = useState('')

  const cars = useMemo(() => {
    let list = [...initialCars]
    if (cat !== 'All') list = list.filter(c => c.cat === cat)
    if (q) list = list.filter(c => c.model.toLowerCase().includes(q.toLowerCase()))
    if (sort === 'price-asc')  list.sort((a, b) => a.rate - b.rate)
    if (sort === 'price-desc') list.sort((a, b) => b.rate - a.rate)
    return list
  }, [initialCars, cat, sort, q])

  return (
    <>
      {/* Page header */}
      <section className="relative pt-32 md:pt-40 pb-12 border-b border-black/[0.08]">
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="text-[11px] tracking-[0.3em] uppercase text-neutral-500">Fleet</div>
              <h1 className="mt-4 text-5xl md:text-7xl font-light leading-[0.95] tracking-tight text-neutral-900">
                Eleven cars, <br /><span className="italic text-neutral-500">one garage.</span>
              </h1>
            </div>
            <p className="text-neutral-600 max-w-sm font-light">
              Everything on the floor is hand‑prepped, detailed, and ready to leave the bay by noon.
            </p>
          </div>

          {/* Filters */}
          <div className="mt-10 rounded-2xl p-3 flex flex-col md:flex-row md:items-center gap-3 bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-1 overflow-x-auto">
              {CATS.map(c => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors whitespace-nowrap ${
                    cat === c ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="flex-1 flex items-center gap-3 md:justify-end">
              <div className="flex-1 md:flex-none md:w-56 flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-100 border border-black/[0.06]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-neutral-500">
                  <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>
                </svg>
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search model"
                  className="bg-transparent outline-none text-sm w-full placeholder:text-neutral-400 text-neutral-900"
                />
              </div>
              <select
                value={sort}
                onChange={e => setSort(e.target.value)}
                className="bg-neutral-100 border border-black/[0.06] rounded-full text-sm px-4 py-2 text-neutral-700 focus:outline-none"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price — low to high</option>
                <option value="price-desc">Price — high to low</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-7xl mx-auto px-6 md:px-10 py-14">
        <div className="mb-6 text-sm text-neutral-500 tabular-nums">
          {cars.length} {cars.length === 1 ? 'car' : 'cars'} ready to drive
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {cars.map(c => <FleetCard key={c.id} car={c} />)}
        </div>
      </section>
    </>
  )
}
