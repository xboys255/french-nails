export type Role = 'client' | 'staff' | 'admin'

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type PaymentStatus = 'unpaid' | 'deposit_paid' | 'paid' | 'refunded'

export interface Profile {
  id: string
  full_name: string
  phone: string
  email: string | null
  role: Role
  avatar_url: string | null
  preferred_language: 'en'
  created_at: string
}

export interface Staff {
  id: string
  profile_id: string
  bio: string | null
  specialties: string[]
  is_active: boolean
  color: string
  profile?: Profile
}

export interface ServiceCategory {
  id: string
  name_en: string
  name_vi: string
  sort_order: number
}

export interface Service {
  id: string
  category_id: string
  name_en: string
  name_vi: string
  description_en: string | null
  description_vi: string | null
  duration_minutes: number
  price: number
  is_active: boolean
  image_url: string | null
  category?: ServiceCategory
}

export interface StaffAvailability {
  id: string
  staff_id: string
  day_of_week: number // 0=Sun, 6=Sat
  start_time: string // HH:mm
  end_time: string   // HH:mm
  is_available: boolean
}

export interface Appointment {
  id: string
  client_id: string
  staff_id: string
  date: string       // YYYY-MM-DD
  start_time: string // HH:mm
  end_time: string   // HH:mm
  status: AppointmentStatus
  payment_status: PaymentStatus
  stripe_payment_intent_id: string | null
  total_amount: number
  deposit_amount: number
  notes: string | null
  promo_code_id: string | null
  discount_amount: number
  created_at: string
  client?: Profile
  staff?: Staff
  services?: AppointmentService[]
}

export interface AppointmentService {
  id: string
  appointment_id: string
  service_id: string
  price: number
  service?: Service
}

export interface Waitlist {
  id: string
  client_id: string
  staff_id: string | null
  service_id: string
  preferred_date: string
  preferred_time_start: string
  preferred_time_end: string
  status: 'waiting' | 'notified' | 'booked' | 'expired'
  created_at: string
}

export interface LoyaltyAccount {
  id: string
  client_id: string
  points: number
  total_earned: number
  total_redeemed: number
}

export interface LoyaltyTransaction {
  id: string
  client_id: string
  appointment_id: string | null
  points: number
  type: 'earned' | 'redeemed' | 'expired'
  description: string
  created_at: string
}

export interface PromoCode {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  uses_count: number
  valid_from: string
  valid_until: string | null
  is_active: boolean
}

export interface TimeSlot {
  time: string   // HH:mm
  available: boolean
  staffId?: string
}
