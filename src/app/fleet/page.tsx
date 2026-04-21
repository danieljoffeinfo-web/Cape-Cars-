import Nav from '@/components/nav'
import Footer from '@/components/footer'
import FleetGrid from '@/components/fleet-grid'
import { createServerClient } from '@/lib/supabase/server'
import { FLEET } from '@/lib/fleet'
import type { Vehicle } from '@/lib/fleet'

export const metadata = { title: 'Fleet — Car Demo' }
export const revalidate = 60

export default async function FleetPage() {
  let vehicles: Vehicle[] = []
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .neq('status', 'Service')
      .order('sort_order', { ascending: true })
    if (data && data.length > 0) {
      vehicles = data as Vehicle[]
    } else {
      vehicles = FLEET.map((c, i) => ({
        ...c,
        id: String(c.id),
        description: null,
        image_url: null,
        sort_order: i,
      }))
    }
  } catch {
    vehicles = FLEET.map((c, i) => ({
      ...c,
      id: String(c.id),
      description: null,
      image_url: null,
      sort_order: i,
    }))
  }

  return (
    <div>
      <Nav active="fleet" theme="dark-on-white" />
      <FleetGrid cars={vehicles} />
      <Footer />
    </div>
  )
}
