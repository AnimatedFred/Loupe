import { createClient } from '@supabase/supabase-js'

// Safety check for placeholder keys
const supabaseUrl = 'https://placeholder-url.supabase.co'
const supabaseAnonKey = 'placeholder-key'

// We create a "safe" mock if the URL is clearly a placeholder
export const supabase = (supabaseUrl.includes('YOUR_PROJECT_URL') || supabaseUrl.includes('placeholder')) 
  ? { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }) } }
  : createClient(supabaseUrl, supabaseAnonKey)
