import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://yzrtbovsxnlaivkofvul.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6cnRib3ZzeG5sYWl2a29mdnVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTc1MTksImV4cCI6MjA5MzU5MzUxOX0.pvke4PggpSZXIWR1CdJkL7Q-0008k8b03qNYA0L4HDk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
