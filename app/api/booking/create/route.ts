import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { createPaymentIntent } from '@/lib/stripe'
import { addMinutes, DEPOSIT_PERCENTAGE } from '@/lib/utils'
import { sendBookingConfirmationSMS } from '@/lib/twilio'
import { sendBookingConfirmation, sendStaffNotification } from '@/lib/resend'
import { formatDate, formatTime } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { serviceIds, staffId, date, startTime, notes, promoCodeId, giftCardId, giftCardDiscount, loyaltyPointsRedeemed, loyaltyDiscount, payAtSalon } = await req.json()

  // Fetch services
  const { data: services } = await supabase
    .from('services')
    .select('*')
    .in('id', serviceIds)

  if (!services?.length) return NextResponse.json({ error: 'No services' }, { status: 400 })

  const totalDuration = services.reduce((a, s) => a + s.duration_minutes, 0)
  const endTime = addMinutes(startTime, totalDuration)
  const subtotal = services.reduce((a, s) => a + s.price, 0)

  // Calculate discount
  let discountAmount = 0
  if (promoCodeId) {
    const { data: promo } = await supabase.from('promo_codes').select('*').eq('id', promoCodeId).single()
    if (promo) {
      discountAmount = promo.discount_type === 'percentage'
        ? Math.round((subtotal * promo.discount_value) / 100)
        : promo.discount_value
    }
  }

  const giftDiscount = giftCardDiscount ?? 0
  const loyaltyDisc = loyaltyDiscount ?? 0
  const total = Math.max(0, subtotal - discountAmount - giftDiscount - loyaltyDisc)
  const deposit = Math.round(total * DEPOSIT_PERCENTAGE)

  // Find available staff if not specified
  let assignedStaffId = staffId
  if (!assignedStaffId) {
    const { data: allStaff } = await supabase.from('staff').select('id').eq('is_active', true)
    assignedStaffId = allStaff?.[0]?.id
  }

  if (!assignedStaffId) return NextResponse.json({ error: 'No staff available' }, { status: 400 })

  // Create appointment
  const { data: appointment, error: apptError } = await supabase
    .from('appointments')
    .insert({
      client_id: user.id,
      staff_id: assignedStaffId,
      date,
      start_time: startTime,
      end_time: endTime,
      status: 'pending',
      payment_status: 'unpaid',
      total_amount: total,
      deposit_amount: deposit,
      discount_amount: discountAmount,
      promo_code_id: promoCodeId ?? null,
      gift_card_id: giftCardId ?? null,
      gift_card_discount: giftDiscount > 0 ? giftDiscount : null,
      loyalty_points_redeemed: loyaltyPointsRedeemed ?? 0,
      notes,
    })
    .select()
    .single()

  if (apptError) return NextResponse.json({ error: apptError.message }, { status: 500 })

  // Insert appointment services
  await supabase.from('appointment_services').insert(
    services.map(s => ({ appointment_id: appointment.id, service_id: s.id, price: s.price }))
  )

  // Increment promo code usage
  if (promoCodeId) {
    await adminSupabase.rpc('increment_promo_usage', { promo_id: promoCodeId })
  }

  // Deduct loyalty points if redeemed
  if (loyaltyPointsRedeemed && loyaltyPointsRedeemed > 0) {
    await adminSupabase.from('loyalty_transactions').insert({
      client_id: user.id,
      appointment_id: appointment.id,
      type: 'redeemed',
      points: loyaltyPointsRedeemed,
      description: 'Redeemed at checkout',
    })
    await adminSupabase.rpc('decrement_loyalty_points', {
      p_client_id: user.id,
      p_points: loyaltyPointsRedeemed,
      p_redeemed: loyaltyPointsRedeemed,
    })
  }

  // Pay at salon — no Stripe needed, confirm immediately
  if (payAtSalon) {
    await adminSupabase.from('appointments').update({ status: 'confirmed' }).eq('id', appointment.id)
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: staffData } = await supabase.from('staff').select('*, profile:profiles(*)').eq('id', assignedStaffId).single()
    const serviceNames = services.map((s: { name_en: string }) => s.name_en)
    const dateLabel = formatDate(date)
    const timeLabel = formatTime(startTime)
    if (profile?.phone) sendBookingConfirmationSMS({ to: profile.phone, clientName: profile.full_name, date: dateLabel, time: timeLabel }).catch(() => {})
    if (profile?.email) sendBookingConfirmation({ to: profile.email, clientName: profile.full_name, date: dateLabel, time: timeLabel, services: serviceNames, staffName: staffData?.profile?.full_name ?? 'Your nail tech', appointmentId: appointment.id }).catch(() => {})
    return NextResponse.json({ appointmentId: appointment.id, clientSecret: null })
  }

  // If deposit is fully covered by gift card, no Stripe needed
  if (deposit <= 0) {
    await adminSupabase.from('appointments').update({ status: 'confirmed', payment_status: 'paid' }).eq('id', appointment.id)
    // Send notifications
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: staffData } = await supabase.from('staff').select('*, profile:profiles(*)').eq('id', assignedStaffId).single()
    const serviceNames = services.map(s => s.name_en)
    const dateLabel = formatDate(date)
    const timeLabel = formatTime(startTime)
    if (profile?.phone) sendBookingConfirmationSMS({ to: profile.phone, clientName: profile.full_name, date: dateLabel, time: timeLabel }).catch(() => {})
    if (profile?.email) sendBookingConfirmation({ to: profile.email, clientName: profile.full_name, date: dateLabel, time: timeLabel, services: serviceNames, staffName: staffData?.profile?.full_name ?? 'Your nail tech', appointmentId: appointment.id }).catch(() => {})
    return NextResponse.json({ appointmentId: appointment.id, clientSecret: null })
  }

  // Create Stripe payment intent for deposit
  const paymentIntent = await createPaymentIntent({
    amount: deposit,
    metadata: { appointmentId: appointment.id, clientId: user.id },
  })

  // Update appointment with payment intent id
  await adminSupabase
    .from('appointments')
    .update({ stripe_payment_intent_id: paymentIntent.id })
    .eq('id', appointment.id)

  // Create loyalty account if missing
  await adminSupabase
    .from('loyalty_accounts')
    .upsert({ client_id: user.id, points: 0, total_earned: 0, total_redeemed: 0 }, { onConflict: 'client_id', ignoreDuplicates: true })

  // Send notifications (non-blocking)
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const { data: staffData } = await supabase
    .from('staff')
    .select('*, profile:profiles(*)')
    .eq('id', assignedStaffId)
    .single()

  const serviceNames = services.map(s => s.name_en)
  const dateLabel = formatDate(date)
  const timeLabel = formatTime(startTime)

  if (profile?.phone) {
    sendBookingConfirmationSMS({ to: profile.phone, clientName: profile.full_name, date: dateLabel, time: timeLabel }).catch(() => {})
  }
  if (profile?.email) {
    sendBookingConfirmation({
      to: profile.email,
      clientName: profile.full_name,
      date: dateLabel,
      time: timeLabel,
      services: serviceNames,
      staffName: staffData?.profile?.full_name ?? 'Your nail tech',
      appointmentId: appointment.id,
    }).catch(() => {})
  }
  if (staffData?.profile?.email) {
    sendStaffNotification({
      to: staffData.profile.email,
      staffName: staffData.profile.full_name,
      clientName: profile?.full_name ?? 'Client',
      date: dateLabel,
      time: timeLabel,
      services: serviceNames,
    }).catch(() => {})
  }

  return NextResponse.json({ appointmentId: appointment.id, clientSecret: paymentIntent.client_secret })
}
