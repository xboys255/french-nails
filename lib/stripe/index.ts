import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
})

export async function createPaymentIntent({
  amount,
  currency = 'usd',
  metadata = {},
}: {
  amount: number
  currency?: string
  metadata?: Record<string, string>
}) {
  return stripe.paymentIntents.create({
    amount,
    currency,
    metadata,
    automatic_payment_methods: { enabled: true },
  })
}

export async function retrievePaymentIntent(id: string) {
  return stripe.paymentIntents.retrieve(id)
}

export async function refundPayment(paymentIntentId: string, amount?: number) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId)
  return stripe.refunds.create({
    payment_intent: pi.id,
    amount,
  })
}
