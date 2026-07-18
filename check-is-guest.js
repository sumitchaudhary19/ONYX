import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY // anon key can't do DDL usually, but let's try
)

async function run() {
  // If we only have anon key, we can't do ALTER TABLE directly.
  // We can try to see if 'is_guest' exists by selecting it.
  const { data, error } = await supabase.from('profiles').select('is_guest').limit(1)
  
  if (error && error.code === '42703') { // Column does not exist
    console.log("Column 'is_guest' does not exist. Please run ALTER TABLE profiles ADD COLUMN is_guest BOOLEAN DEFAULT false; in Supabase SQL editor.")
  } else if (error) {
    console.error(error)
  } else {
    console.log("Column 'is_guest' exists!")
  }
}

run()
