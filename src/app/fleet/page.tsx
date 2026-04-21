import Nav from '@/components/nav'
import Footer from '@/components/footer'
import FleetGrid from '@/components/fleet-grid'
import { FLEET } from '@/lib/fleet'

export const metadata = { title: 'Fleet — Cape Cars' }

export default function FleetPage() {
  return (
    <div>
      <Nav active="fleet" theme="dark-on-white" />
      <FleetGrid cars={FLEET} />
      <Footer />
    </div>
  )
}
