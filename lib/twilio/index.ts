import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const FROM = process.env.TWILIO_PHONE_NUMBER!
const SALON = process.env.NEXT_PUBLIC_SALON_NAME ?? 'French Nails'

export async function sendSMS(to: string, body: string) {
  return client.messages.create({ from: FROM, to, body })
}

export async function sendBookingConfirmationSMS({
  to,
  clientName,
  date,
  time,
}: {
  to: string
  clientName: string
  date: string
  time: string
}) {
  return sendSMS(
    to,
    `Hi ${clientName}! Your appointment at ${SALON} is confirmed for ${date} at ${time}. See you soon!`
  )
}

export async function sendReminderSMS({
  to,
  clientName,
  date,
  time,
}: {
  to: string
  clientName: string
  date: string
  time: string
}) {
  return sendSMS(
    to,
    `Hi ${clientName}! Reminder: Your appointment at ${SALON} is tomorrow, ${date} at ${time}. To reschedule, please call us at least 2 hours before.`
  )
}

export async function sendCancellationSMS({
  to,
  clientName,
}: {
  to: string
  clientName: string
}) {
  return sendSMS(
    to,
    `Hi ${clientName}, your appointment at ${SALON} has been cancelled. We hope to see you soon!`
  )
}

export async function sendReviewRequestSMS({
  to,
  clientName,
  salonName = SALON,
}: {
  to: string
  clientName: string
  salonName?: string
}) {
  return sendSMS(
    to,
    `Hi ${clientName}! Thank you for visiting ${salonName}! We'd love to hear how your experience was. Leave us a quick review — it means the world to us! 💅`
  )
}

export async function sendWaitlistNotificationSMS({
  to,
  clientName,
  date,
  time,
}: {
  to: string
  clientName: string
  date: string
  time: string
}) {
  return sendSMS(
    to,
    `Hi ${clientName}! Great news — a slot opened up at ${SALON} on ${date} at ${time}. Book now before it's gone!`
  )
}
