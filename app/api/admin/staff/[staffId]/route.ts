import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface AvailDay {
  day_of_week: number
  is_available: boolean
  start_time: string
  end_time: string
}

interface Params {
  params: Promise<{ staffId: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { staffId } = await params

  // Verify requester is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { full_name, phone, email, color, bio, is_active, availability } = body

  const admin = createServiceClient()

  // Fetch the staff record to get profile_id
  const { data: staffRecord, error: fetchError } = await admin
    .from('staff')
    .select('id, profile_id')
    .eq('id', staffId)
    .single()

  if (fetchError || !staffRecord) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 })
  }

  // Update profile fields (only what was provided)
  const profilePatch: Record<string, unknown> = {}
  if (full_name !== undefined) profilePatch.full_name = full_name
  if (phone !== undefined) profilePatch.phone = phone
  if (email !== undefined) profilePatch.email = email

  if (Object.keys(profilePatch).length > 0) {
    const { error: profileError } = await admin
      .from('profiles')
      .update(profilePatch)
      .eq('id', staffRecord.profile_id)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }
  }

  // Update staff record fields
  const staffPatch: Record<string, unknown> = {}
  if (color !== undefined) staffPatch.color = color
  if (bio !== undefined) staffPatch.bio = bio
  if (is_active !== undefined) staffPatch.is_active = is_active

  if (Object.keys(staffPatch).length > 0) {
    const { error: staffError } = await admin
      .from('staff')
      .update(staffPatch)
      .eq('id', staffId)

    if (staffError) {
      return NextResponse.json({ error: staffError.message }, { status: 500 })
    }
  }

  // Upsert availability if provided
  if (Array.isArray(availability) && availability.length > 0) {
    const { error: availError } = await admin
      .from('staff_availability')
      .upsert(
        availability.map((d: AvailDay) => ({
          staff_id: staffId,
          day_of_week: d.day_of_week,
          is_available: d.is_available,
          start_time: d.start_time,
          end_time: d.end_time,
        })),
        { onConflict: 'staff_id,day_of_week' }
      )

    if (availError) {
      return NextResponse.json({ error: availError.message }, { status: 500 })
    }
  }

  // Return updated staff with all relations
  const { data: updated } = await admin
    .from('staff')
    .select('*, profile:profiles(*), availability:staff_availability(*)')
    .eq('id', staffId)
    .single()

  return NextResponse.json({ staff: updated })
}
