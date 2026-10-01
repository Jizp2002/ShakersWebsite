import { createClient } from '@supabase/supabase-js';
import { connectionSettings } from './connection';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const { configError, isDemo } = connectionSettings(
  url,
  key,
  import.meta.env.VITE_ENABLE_DEMO,
);
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
