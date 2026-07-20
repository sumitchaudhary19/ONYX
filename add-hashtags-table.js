import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const envPath = path.resolve(process.cwd(), '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '')
  }
})

const supabaseUrl = env['VITE_SUPABASE_URL']
const supabaseKey = env['VITE_SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY']
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("SQL script to run in Supabase:")
  console.log(`
    CREATE TABLE IF NOT EXISTS hashtags (
      tag varchar(100) PRIMARY KEY,
      count integer DEFAULT 1,
      created_at timestamp with time zone DEFAULT now()
    );
  `)
}

run()
