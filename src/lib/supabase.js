import { createClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────
// STEP 1: Go to https://supabase.com → New Project
// STEP 2: Copy your Project URL and anon key below
// STEP 3: Run the SQL in /supabase_setup.sql in Supabase SQL Editor
// ─────────────────────────────────────────────────────

const SUPABASE_URL = 'https://buiyozzanvaxwiweqlpo.supabase.co'       // ← replace
const SUPABASE_ANON_KEY = 'sb_publishable_Zhr8O8HbLDVW298imBIb8w_ydHuxoum'                     // ← replace

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
