import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateTimeSlots, addMinutes, getDayOfWeek, SALON_OPEN, SALON_CLOSE } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const duration = parseInt(searchParams.get('duration') ?? '60')
  const staffId = searchParams.get('staffId') || null

  if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 })

  const supabase = await createClient()
  const dayOfWeek = getDayOfWeek(date)

  // Get staff to check
  let staffIds: string[] = []

  if (staffId) {
    staffIds = [staffId]
  } else {
    const { data: allStaff } = await supabase.from('staff').select('id').eq('is_active', true)
    staffIds = allStaff?.map(s => s.id) ?? []
  }

  // Get availability & time off
  const { data: availability } = await supabase
    .from('staff_availability')
    .select('*')
    .in('staff_id', staffIds)
    .eq('day_of_week', dayOfWeek)
    .eq('is_available', true)

  const { data: timeOff } = await supabase
    .from('staff_time_off')
    .select('staff_id')
    .in('staff_id', staffIds)
    .eq('date', date)

  const offIds = new Set(timeOff?.map(t => t.staff_id) ?? [])
  const availableStaff = (availability ?? []).filter(a => !offIds.has(a.staff_id))

  if (availableStaff.length === 0) {
    return NextResponse.json({ slots: [] })
  }

  // Get existing appointments
  const { data: appointments } = await supabase
    .from('appointments')
    .select('staff_id, start_time, end_time')
    .in('staff_id', staffIds)
    .eq('date', date)
    .in('status', ['pending', 'confirmed', 'in_progress'])

  // Build slot availability per 30-min interval
  const allSlots = generateTimeSlots(SALON_OPEN, SALON_CLOSE, 30)

  const slots = allSlots.map(slot => {
    const slotEnd = addMinutes(slot, duration)

    // Check if any staff member is available for this slot
    const available = availableStaff.some(avail => {
      // Slot within staff hours
      if (slot < avail.start_time || slotEnd > avail.end_time) return false

      // No conflicting appointment for this staff member
      const conflicts = (appointments ?? []).filter(a => {
        if (a.staff_id !== avail.staff_id) return false
        return slot < a.end_time && slotEnd > a.start_time
      })

      return conflicts.length === 0
    })

    return { time: slot, available }
  })

  return NextResponse.json({ slots })
}
