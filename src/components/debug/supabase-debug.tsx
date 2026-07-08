/**
 * SupabaseDebug — intentionally emptied for production.
 *
 * Previously attached the Supabase client singleton to window.supabase
 * for browser console debugging. This is a security risk in production
 * as it exposes the client object to XSS attacks.
 *
 * To re-enable debug mode locally, set NEXT_PUBLIC_DEBUG_SUPABASE=true
 * in your .env.local file.
 */
export default function SupabaseDebug() {
  return null;
}
