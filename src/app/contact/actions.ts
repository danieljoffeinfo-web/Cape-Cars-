'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function createBooking(formData: FormData) {
  const payload = {
    name:           String(formData.get('name') ?? ''),
    email:          String(formData.get('email') ?? ''),
    phone:          (String(formData.get('phone') ?? '')) || null,
    preferred_date: (String(formData.get('date') ?? '')) || null,
    car_interest:   (String(formData.get('car') ?? '')) || null,
    booking_type:   String(formData.get('type') ?? 'Afternoon'),
    notes:          (String(formData.get('notes') ?? '')) || null,
  }

  try {
    const supabase = createServerClient()
    await supabase.from('bookings').insert(payload)
  } catch {
    // Supabase not wired up yet — silent fallback for local dev
    console.log('[booking]', payload)
  }
}
