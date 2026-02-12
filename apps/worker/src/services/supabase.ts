import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

// Uses SERVICE_ROLE key — bypasses RLS — server-side only
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY
);
