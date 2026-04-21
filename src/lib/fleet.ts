import { createClient } from './supabase/client'

export type Car = {
  id: number
  model: string
  cat: 'Track' | 'Supercar' | 'Grand Tourer' | 'Electric' | 'Daily'
  power: string
  seats: number
  fuel: 'Petrol' | 'Hybrid' | 'Electric'
  rate: number
  status: 'Available' | 'Booked' | 'Service'
  color: string
}

export type Vehicle = {
  id: string
  model: string
  cat: 'Track' | 'Supercar' | 'Grand Tourer' | 'Electric' | 'Daily'
  power: string
  seats: number
  fuel: 'Petrol' | 'Hybrid' | 'Electric'
  rate: number
  status: 'Available' | 'Booked' | 'Service'
  color: string
  description: string | null
  image_url: string | null
  sort_order: number
}

export const FLEET: Car[] = [
  { id: 1,  model: 'Porsche 911 GT3',         cat: 'Track',        power: '502 hp', seats: 2, fuel: 'Petrol',   rate: 38000, status: 'Available', color: 'Shark Blue' },
  { id: 2,  model: 'McLaren 720S',            cat: 'Supercar',     power: '710 hp', seats: 2, fuel: 'Petrol',   rate: 49000, status: 'Available', color: 'Papaya' },
  { id: 3,  model: 'Aston Martin DB12',       cat: 'Grand Tourer', power: '671 hp', seats: 4, fuel: 'Petrol',   rate: 30000, status: 'Available', color: 'Ion Green' },
  { id: 4,  model: 'Lamborghini Huracán STO', cat: 'Track',        power: '631 hp', seats: 2, fuel: 'Petrol',   rate: 46000, status: 'Booked',    color: 'Arancio' },
  { id: 5,  model: 'Ferrari 296 GTB',         cat: 'Supercar',     power: '819 hp', seats: 2, fuel: 'Hybrid',   rate: 54000, status: 'Available', color: 'Rosso' },
  { id: 6,  model: 'BMW M4 CSL',              cat: 'Daily',        power: '543 hp', seats: 4, fuel: 'Petrol',   rate: 14000, status: 'Available', color: 'Frozen Brooklyn' },
  { id: 7,  model: 'Porsche Taycan Turbo S',  cat: 'Electric',     power: '750 hp', seats: 4, fuel: 'Electric', rate: 22000, status: 'Available', color: 'Dolomite' },
  { id: 8,  model: 'Mercedes-AMG GT Black',   cat: 'Track',        power: '720 hp', seats: 2, fuel: 'Petrol',   rate: 43000, status: 'Service',   color: 'Obsidian' },
  { id: 9,  model: 'Porsche Cayman GT4 RS',   cat: 'Track',        power: '493 hp', seats: 2, fuel: 'Petrol',   rate: 27000, status: 'Available', color: 'Gulf Blue' },
  { id: 10, model: 'Audi R8 V10',             cat: 'Supercar',     power: '602 hp', seats: 2, fuel: 'Petrol',   rate: 26000, status: 'Available', color: 'Nardo' },
  { id: 11, model: 'Lotus Emira V6',          cat: 'Daily',        power: '400 hp', seats: 2, fuel: 'Petrol',   rate: 13000, status: 'Available', color: 'Seneca' },
]

export const FLEET_MODELS = FLEET.map(c => c.model)

export async function fetchVehicles(): Promise<Vehicle[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error || !data) return []
  return data as Vehicle[]
}
