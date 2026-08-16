import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://dygjmgehmdxxumgqzfyo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5Z2ptZ2VobWR4eHVtZ3F6ZnlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYyODU3NzcsImV4cCI6MjEwMTg2MTc3N30.I6fQ27eQC-yuPCtY1gnb5XgVTG4qVPSSQ41K3eMRe8o'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
