import type { Metadata } from 'next'
import AdminShell from './shell'

export const metadata: Metadata = { title: 'Admin — Cape Cars' }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
