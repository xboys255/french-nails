import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

interface AvailDay {
  day_of_week: number
  is_available: boolean
  start_time: string
  end_time: string
}

export async function POST(req: NextRequest) {
  // Verify requester is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { full_name, phone, email, password, color, bio, availability } = body

  if (!full_name || !phone || !email || !password) {
    return NextResponse.json({ error: 'Name, phone, email and password are required' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const admin = createServiceClient()

  // 1. Create auth user — email_confirm: true skips the confirmation email
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message ?? 'Failed to create auth user' }, { status: 400 })
  }

  const uid = authData.user.id

  // 2. The handle_new_user trigger creates the profile with role='client'.
  //    Update it to 'staff' and ensure name/phone are correct.
  const { error: profileError } = await admin
    .from('profiles')
    .update({ full_name, phone, role: 'staff' })
    .eq('id', uid)

  if (profileError) {
    // Rollback: delete the auth user to avoid orphans
    await admin.auth.admin.deleteUser(uid)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  // 3. Create staff record
  const { data: staffRecord, error: staffError } = await admin
    .from('staff')
    .insert({
      profile_id: uid,
      color: color ?? '#3f3f46',
      bio: bio ?? null,
      is_active: true,
      specialties: [],
    })
    .select('*, profile:profiles(*), availability:staff_availability(*)')
    .single()

  if (staffError || !staffRecord) {
    await admin.auth.admin.deleteUser(uid)
    return NextResponse.json({ error: staffError?.message ?? 'Failed to create staff record' }, { status: 500 })
  }

  // 4. Insert availability rows
  const avails: AvailDay[] = availability ?? []
  if (avails.length > 0) {
    await admin.from('staff_availability').insert(
      avails.map((d: AvailDay) => ({
        staff_id: staffRecord.id,
        day_of_week: d.day_of_week,
        is_available: d.is_available,
        start_time: d.start_time,
        end_time: d.end_time,
      }))
    )
  }

  // Re-fetch with availability
  const { data: full } = await admin
    .from('staff')
    .select('*, profile:profiles(*), availability:staff_availability(*)')
    .eq('id', staffRecord.id)
    .single()

  return NextResponse.json({ staff: full })
}
