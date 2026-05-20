import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount / 100)
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'MMMM d, yyyy')
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  return `${h}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = []
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startTotal = startH * 60 + startM
  const endTotal = endH * 60 + endM

  for (let t = startTotal; t < endTotal; t += intervalMinutes) {
    const h = Math.floor(t / 60)
    const m = t % 60
    slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`)
  }
  return slots
}

export function getDayOfWeek(dateStr: string): number {
  return parseISO(dateStr).getDay()
}

export const POINTS_PER_DOLLAR = 10
export const POINTS_REDEMPTION_RATE = 100 // 100 points = $1
export const DEPOSIT_PERCENTAGE = 0.3    // 30% deposit
export const CANCELLATION_HOURS = 2
export const SALON_OPEN = '09:00'
export const SALON_CLOSE = '19:00'
