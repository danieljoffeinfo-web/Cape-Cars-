import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import AdminButton from '@/components/admin-button'
import './globals.css'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'Cape Cars — Keys for the day.',
  description: "Cape Town's premier car rental experience. Cape Cars — premium vehicles, rented by the day.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-[var(--bg)] text-[var(--ink)] antialiased">
        {children}
        <AdminButton />
      </body>
    </html>
  )
}
