import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@frenchnails.com'
const SALON = process.env.NEXT_PUBLIC_SALON_NAME ?? 'French Nails'

export async function sendBookingConfirmation({
  to,
  clientName,
  date,
  time,
  services,
  staffName,
  appointmentId,
}: {
  to: string
  clientName: string
  date: string
  time: string
  services: string[]
  staffName: string
  appointmentId: string
}) {
  return resend.emails.send({
    from: `${SALON} <${FROM}>`,
    to,
    subject: `Booking Confirmed — ${date} at ${time}`,
    html: `
      <h2>Hi ${clientName}, your appointment is confirmed!</h2>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Services:</strong> ${services.join(', ')}</p>
      <p><strong>Nail Tech:</strong> ${staffName}</p>
      <p><strong>Booking ID:</strong> ${appointmentId}</p>
      <p>We look forward to seeing you at ${SALON}!</p>
    `,
  })
}

export async function sendBookingReminder({
  to,
  clientName,
  date,
  time,
  staffName,
}: {
  to: string
  clientName: string
  date: string
  time: string
  staffName: string
}) {
  return resend.emails.send({
    from: `${SALON} <${FROM}>`,
    to,
    subject: `Reminder: Your appointment tomorrow at ${time}`,
    html: `
      <h2>Hi ${clientName}, just a reminder!</h2>
      <p>Your appointment at ${SALON} is tomorrow.</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Nail Tech:</strong> ${staffName}</p>
      <p>Need to reschedule? Please do so at least 2 hours before your appointment.</p>
    `,
  })
}

export async function sendCancellationEmail({
  to,
  clientName,
  date,
  time,
  refunded,
}: {
  to: string
  clientName: string
  date: string
  time: string
  refunded: boolean
}) {
  return resend.emails.send({
    from: `${SALON} <${FROM}>`,
    to,
    subject: 'Appointment Cancelled',
    html: `
      <h2>Hi ${clientName}, your appointment has been cancelled.</h2>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      ${refunded ? '<p>Your deposit has been refunded and will appear within 5-7 business days.</p>' : '<p>As the cancellation was within 2 hours of your appointment, the deposit is non-refundable.</p>'}
      <p>We hope to see you again soon at ${SALON}!</p>
    `,
  })
}

export async function sendStaffNotification({
  to,
  staffName,
  clientName,
  date,
  time,
  services,
}: {
  to: string
  staffName: string
  clientName: string
  date: string
  time: string
  services: string[]
}) {
  return resend.emails.send({
    from: `${SALON} <${FROM}>`,
    to,
    subject: `New Booking: ${clientName} on ${date}`,
    html: `
      <h2>Hi ${staffName}, you have a new appointment!</h2>
      <p><strong>Client:</strong> ${clientName}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Services:</strong> ${services.join(', ')}</p>
    `,
  })
}
