import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { supabaseProjectUrl, supabasePublishableKey } from './supabase-config.js';

let supabaseClientInstance = null;

export function getSupabaseClient() {
  if (!supabaseClientInstance) {
    supabaseClientInstance = createClient(supabaseProjectUrl, supabasePublishableKey);
  }

  return supabaseClientInstance;
}
