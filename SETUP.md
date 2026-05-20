# French Nails — Setup Guide

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Copy your **Project URL** and **anon key** from Settings → API
3. Copy your **service_role key** (keep this secret!)
4. In the SQL Editor, run both migration files in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_functions.sql`
5. In Authentication → Providers → Phone, enable **Twilio** and enter your Twilio credentials

## Step 2: Create a Stripe Account

1. Go to [stripe.com](https://stripe.com) → Get API keys
2. Copy your **Publishable key** and **Secret key**
3. For webhooks: Stripe Dashboard → Webhooks → Add endpoint
   - URL: `https://your-app.vercel.app/api/stripe/webhook`
   - Events: `payment_intent.succeeded`
4. Copy the **Webhook signing secret**

## Step 3: Set Up Twilio (SMS)

1. Go to [twilio.com](https://twilio.com) → Get a phone number
2. Copy: Account SID, Auth Token, and your Twilio phone number
3. Enable OTP in Supabase: Auth → Providers → Phone → Twilio

## Step 4: Set Up Resend (Email)

1. Go to [resend.com](https://resend.com) → Create API key
2. Verify your sending domain or use the default `onboarding@resend.dev` for testing

## Step 5: Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

Then fill in:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SALON_NAME=French Nails
```

## Step 6: Run Locally

```bash
npm run dev
```

Open http://localhost:3000

## Step 7: Create Your Admin Account

1. Sign in with your phone number at `/en/auth/login`
2. In Supabase SQL Editor, run:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE phone = '+1YOURNUMBER';
   ```
3. Refresh and you'll be redirected to the Admin Dashboard

## Step 8: Create Staff Accounts

1. Each staff member signs in with their phone
2. You promote them in Supabase:
   ```sql
   UPDATE profiles SET role = 'staff' WHERE phone = '+1STAFFNUMBER';
   
   -- Then create their staff record:
   INSERT INTO staff (profile_id, color, is_active)
   SELECT id, '#ec4899', true FROM profiles WHERE phone = '+1STAFFNUMBER';
   
   -- Set their weekly availability (0=Sun, 6=Sat):
   INSERT INTO staff_availability (staff_id, day_of_week, start_time, end_time, is_available)
   SELECT s.id, d.day, '09:00', '19:00', true
   FROM staff s, generate_series(0,6) d(day)
   WHERE s.profile_id = (SELECT id FROM profiles WHERE phone = '+1STAFFNUMBER');
   ```

## Step 9: Deploy to Vercel

```bash
npx vercel
```

Or push to GitHub and connect at [vercel.com](https://vercel.com).
Add all environment variables in Vercel Project → Settings → Environment Variables.
Update `NEXT_PUBLIC_APP_URL` to your Vercel URL.
Update your Stripe webhook URL to the Vercel URL.

## App Structure

| URL | Who sees it |
|-----|------------|
| `/en` | Public homepage |
| `/en/book` | Anyone — book appointments |
| `/en/auth/login` | Sign in with phone OTP |
| `/en/client/appointments` | Logged-in clients |
| `/en/client/loyalty` | Logged-in clients |
| `/en/client/profile` | Logged-in clients |
| `/en/staff` | Staff members |
| `/en/admin` | Admin only |
| `/en/admin/services` | Admin — manage services |
| `/en/admin/staff` | Admin — manage staff |
| `/en/admin/promo-codes` | Admin — create promo codes |
| `/en/admin/reports` | Admin — revenue reports |

Switch to Vietnamese: replace `/en/` with `/vi/` in any URL.
