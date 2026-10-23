import { createBrowserClient } from '@supabase/ssr';

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('your-project-id') &&
    !key.includes('your-anon-key') &&
    url.startsWith('https://')
  );
};

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!isSupabaseConfigured() || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
