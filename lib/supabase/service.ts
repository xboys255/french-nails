import { createClient } from '@supabase/supabase-js'

/**
 * Server-only admin client using the service role key.
 * Bypasses RLS and exposes supabase.auth.admin.* methods.
 * Never expose this client to the browser.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
