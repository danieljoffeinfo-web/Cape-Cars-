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

export const TELEGRAM_CATALOG: TelegramCatalogVehicle[] = [
  {
    id: 'mini-countryman-s',
    model: 'Mini Countryman S',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589716/cape-cars/Mid%20Tier%20Vehicles/Mini%20Countryman%20S.jpg',
  },
  {
    id: 'hyundai-accent-sedan',
    model: 'Hyundai Accent Sedan',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589720/cape-cars/Mid%20Tier%20Vehicles/Hyundai%20Accent%20Sedan.jpg',
  },
  {
    id: 'hyundai-i20-hatchback',
    model: 'Hyundai i20 Hatchback',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589723/cape-cars/Mid%20Tier%20Vehicles/Hyundai%20i20%20Hatchback.jpg',
  },
  {
    id: 'porsche-718-cayman',
    model: 'Porsche 718 Cayman',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589726/cape-cars/Luxury%20Vehicles/Porsche%20718%20Cayman.jpg',
  },
  {
    id: 'kia-picanto',
    model: 'Kia Picanto',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589730/cape-cars/Mid%20Tier%20Vehicles/Kia%20Picanto.jpg',
  },
  {
    id: 'audi-q5-sq5',
    model: 'Audi Q5 SQ5',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589734/cape-cars/Luxury%20Vehicles/Audi%20Q5%20SQ5.jpg',
  },
  {
    id: 'mercedes-a-class-hatchback',
    model: 'Mercedes A-Class Hatchback',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589737/cape-cars/Luxury%20Vehicles/Mercedes%20A-Class%20Hatchback.jpg',
  },
  {
    id: 'mercedes-g-class-g63',
    model: 'Mercedes G-Class G63',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589740/cape-cars/Luxury%20Vehicles/Mercedes%20G-Class%20G63.jpg',
  },
  {
    id: 'bmw-4-series-gran-coupe',
    model: 'BMW 4 Series Gran Coupe',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589743/cape-cars/Luxury%20Vehicles/BMW%204%20Series%20Gran%20Coupe.jpg',
  },
  {
    id: 'audi-q3-rs-q3-sportback',
    model: 'Audi Q3 RS Q3 Sportback',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589746/cape-cars/Luxury%20Vehicles/Audi%20Q3%20RS%20Q3%20Sportback.jpg',
  },
  {
    id: 'mercedes-gle-coupe',
    model: 'Mercedes GLE Coupe',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589749/cape-cars/Luxury%20Vehicles/Mercedes%20GLE%20Coupe.jpg',
  },
  {
    id: 'jeep-wrangler-rubicon',
    model: 'Jeep Wrangler Rubicon',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589752/cape-cars/Large%20Vehicles/Jeep%20Wrangler%20Rubicon.jpg',
  },
  {
    id: 'audi-a5-cabriolet',
    model: 'Audi A5 Cabriolet',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589755/cape-cars/Luxury%20Vehicles/Audi%20A5%20Cabriolet.jpg',
  },
  {
    id: 'volkswagen-tiguan-allspace',
    model: 'Volkswagen Tiguan Allspace',
    category: 'Mid Tier Vehicles',
    rate: 2000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589758/cape-cars/Mid%20Tier%20Vehicles/Volkswagen%20Tiguan%20Allspace.jpg',
  },
  {
    id: 'bmw-x5',
    model: 'BMW X5',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589761/cape-cars/Luxury%20Vehicles/BMW%20X5.jpg',
  },
  {
    id: 'jaguar-f-type-coupe',
    model: 'Jaguar F-Type Coupe',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589764/cape-cars/Luxury%20Vehicles/Jaguar%20F-Type%20Coupe.jpg',
  },
  {
    id: 'bmw-x5-m',
    model: 'BMW X5 M',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589767/cape-cars/Luxury%20Vehicles/BMW%20X5%20M.jpg',
  },
  {
    id: 'hyundai-staria',
    model: 'Hyundai Staria',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589770/cape-cars/Large%20Vehicles/Hyundai%20Staria.jpg',
  },
  {
    id: 'range-rover-sport',
    model: 'Range Rover Sport',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589773/cape-cars/Luxury%20Vehicles/Range%20Rover%20Sport.jpg',
  },
  {
    id: 'mercedes-c-class-sedan',
    model: 'Mercedes C-Class Sedan',
    category: 'Luxury Vehicles',
    rate: 7000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589776/cape-cars/Luxury%20Vehicles/Mercedes%20C-Class%20Sedan.jpg',
  },
  {
    id: 'hyundai-staria-2',
    model: 'Hyundai Staria 2',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589779/cape-cars/Large%20Vehicles/Hyundai%20Staria%202.jpg',
  },
  {
    id: 'hyundai-h1-grand-starex',
    model: 'Hyundai H1 Grand Starex',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589780/cape-cars/Large%20Vehicles/Hyundai%20H1%20Grand%20Starex.jpg',
  },
  {
    id: 'mercedes-sprinter-van',
    model: 'Mercedes Sprinter Van',
    category: 'Large Vehicles',
    rate: 4000,
    status: 'Available',
    imageUrl: 'https://res.cloudinary.com/dmanxetyl/image/upload/v1778589783/cape-cars/Large%20Vehicles/Mercedes%20Sprinter%20Van.jpg',
  },
]
