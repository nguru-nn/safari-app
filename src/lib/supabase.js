import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dygjmgehmdxxumgqzfyo.supabase.co'
const supabaseAnonKey = 'sb_publishable_uLAOzFmpIbPAPxIbprXjsQ_xldUOLSV'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
