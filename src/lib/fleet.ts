import { createClient } from './supabase/client'

export type VehicleCategory = 'Luxury Vehicles' | 'Mid Tier Vehicles' | 'Large Vehicles'

export type Car = {
  id: number
  model: string
  cat: VehicleCategory
  power: string
  seats: number
  fuel: 'Petrol' | 'Hybrid' | 'Electric' | 'Diesel'
  rate: number
  status: 'Available' | 'Booked' | 'Service'
  color: string
}

export type Vehicle = {
  id: string
  model: string
  cat: VehicleCategory
  power: string
  seats: number
  fuel: 'Petrol' | 'Hybrid' | 'Electric' | 'Diesel'
  rate: number
  status: 'Available' | 'Booked' | 'Service'
  color: string
  description: string | null
  image_url: string | null
  sort_order: number
}

export const FLEET: Car[] = []

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
