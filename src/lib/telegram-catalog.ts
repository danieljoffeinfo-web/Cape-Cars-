export type VehicleCategory = 'Luxury Vehicles' | 'Mid Tier Vehicles' | 'Large Vehicles'

export type TelegramCatalogVehicle = {
  id: string
  model: string
  category: VehicleCategory
  rate: number
  status: 'Available' | 'Booked' | 'Service'
  imageUrl: string
}

export const CATEGORY_ORDER: VehicleCategory[] = [
  'Luxury Vehicles',
  'Mid Tier Vehicles',
  'Large Vehicles',
]

export const CATEGORY_PRICING: Record<VehicleCategory, number> = {
  'Luxury Vehicles': 7000,
  'Mid Tier Vehicles': 2000,
  'Large Vehicles': 4000,
}

const FALLBACK_PUBLIC_BASE_URL = 'https://car-demo-chom.vercel.app'
const CLOUINARY_CLOUD = 'dmanxetyl'

function publicBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
    || process.env.NEXT_PUBLIC_APP_URL
    || process.env.VERCEL_PROJECT_PRODUCTION_URL
    || process.env.VERCEL_URL

  if (!fromEnv) return FALLBACK_PUBLIC_BASE_URL
  return fromEnv.startsWith('http') ? fromEnv : `https://${fromEnv}`
}

function catalogImage(category: VehicleCategory, fileName: string) {
  const sourceUrl = `${publicBaseUrl()}/telegram-cars/${encodeURIComponent(category)}/${encodeURIComponent(fileName)}`
  return `https://res.cloudinary.com/${CLOUINARY_CLOUD}/image/fetch/f_auto,q_auto/${encodeURIComponent(sourceUrl)}`
}

export const TELEGRAM_CATALOG: TelegramCatalogVehicle[] = [
  {
    id: 'mini-countryman-s',
    model: 'Mini Countryman S',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: catalogImage('Mid Tier Vehicles', 'Image 13.jpg'),
  },
  {
    id: 'hyundai-accent-sedan',
    model: 'Hyundai Accent Sedan',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: catalogImage('Mid Tier Vehicles', 'Image 16.jpg'),
  },
  {
    id: 'hyundai-i20-hatchback',
    model: 'Hyundai i20 Hatchback',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: catalogImage('Mid Tier Vehicles', 'Image 19.jpg'),
  },
  {
    id: 'porsche-718-cayman',
    model: 'Porsche 718 Cayman',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 1.jpg'),
  },
  {
    id: 'kia-picanto',
    model: 'Kia Picanto',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: catalogImage('Mid Tier Vehicles', 'Image 21.jpg'),
  },
  {
    id: 'audi-q5-sq5',
    model: 'Audi Q5 SQ5',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 11.jpg'),
  },
  {
    id: 'mercedes-a-class-hatchback',
    model: 'Mercedes A-Class Hatchback',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 12.jpg'),
  },
  {
    id: 'mercedes-g-class-g63',
    model: 'Mercedes G-Class G63',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 14.jpg'),
  },
  {
    id: 'bmw-4-series-gran-coupe',
    model: 'BMW 4 Series Gran Coupe',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 15.jpg'),
  },
  {
    id: 'audi-q3-rs-q3-sportback',
    model: 'Audi Q3 RS Q3 Sportback',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 17.jpg'),
  },
  {
    id: 'mercedes-gle-coupe',
    model: 'Mercedes GLE Coupe',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 18.jpg'),
  },
  {
    id: 'jeep-wrangler-rubicon',
    model: 'Jeep Wrangler Rubicon',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: catalogImage('Large Vehicles', 'Image 13.jpg'),
  },
  {
    id: 'audi-a5-cabriolet',
    model: 'Audi A5 Cabriolet',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 2.jpg'),
  },
  {
    id: 'volkswagen-tiguan-allspace',
    model: 'Volkswagen Tiguan Allspace',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: catalogImage('Mid Tier Vehicles', 'Image 22.jpg'),
  },
  {
    id: 'bmw-x5',
    model: 'BMW X5',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 23.jpg'),
  },
  {
    id: 'jaguar-f-type-coupe',
    model: 'Jaguar F-Type Coupe',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 3.jpg'),
  },
  {
    id: 'bmw-x5-m',
    model: 'BMW X5 M',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 4.jpg'),
  },
  {
    id: 'hyundai-staria',
    model: 'Hyundai Staria',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: catalogImage('Large Vehicles', 'Image 25.jpg'),
  },
  {
    id: 'range-rover-sport',
    model: 'Range Rover Sport',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 5.jpg'),
  },
  {
    id: 'mercedes-c-class-sedan',
    model: 'Mercedes C-Class Sedan',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: catalogImage('Luxury Vehicles', 'Image 6.jpg'),
  },
  {
    id: 'hyundai-staria-2',
    model: 'Hyundai Staria 2',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: catalogImage('Large Vehicles', 'Image 25 2.jpg'),
  },
  {
    id: 'hyundai-h1-grand-starex',
    model: 'Hyundai H1 Grand Starex',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: catalogImage('Large Vehicles', 'Image 6.jpg'),
  },
  {
    id: 'mercedes-sprinter-van',
    model: 'Mercedes Sprinter Van',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: catalogImage('Large Vehicles', 'Image 7.jpg'),
  },
]

export const TELEGRAM_CATALOG_IMAGE_BY_MODEL = Object.fromEntries(
  TELEGRAM_CATALOG.map((vehicle) => [vehicle.model, vehicle.imageUrl]),
) as Record<string, string>
