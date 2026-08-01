import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envFile = fs.readFileSync('.env.local', 'utf-8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => { const i = line.indexOf('='); return [line.slice(0,i).trim(), line.slice(i+1).trim()] })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

async function testQuery() {
  console.log('=== Test 1: Raw select (no filters) ===')
  const { data: d1, error: e1 } = await supabase.from('forge_listings').select('*')
  console.log('Error:', e1)
  console.log('Count:', d1?.length)
  if (d1?.length > 0) console.log('Sample:', JSON.stringify(d1[0], null, 2))

  console.log('\n=== Test 2: With .neq(status, completed) ===')
  const { data: d2, error: e2 } = await supabase.from('forge_listings').select('*').neq('status', 'completed')
  console.log('Error:', e2)
  console.log('Count:', d2?.length)

  console.log('\n=== Test 3: Fetch friend_requests ===')
  const { data: d3, error: e3 } = await supabase.from('friend_requests').select('*').limit(1)
  console.log('Error:', e3)
  console.log('Data:', d3)

  console.log('\n=== Test 4: With owner join ===')
  const { data: d4, error: e4 } = await supabase.from('forge_listings')
    .select('*, owner:owner_id(id,first_name,last_name,avatar_url,username,forge_rating_avg,total_gigs_completed,top_hustler)')
  console.log('Error:', e4)
  console.log('Count:', d4?.length)

  console.log('\n=== Test 5: Simple owner join ===')
  const { data: d5, error: e5 } = await supabase.from('forge_listings')
    .select('*, owner:owner_id(id,first_name,last_name,avatar_url,username)')
  console.log('Error:', e5)
  console.log('Count:', d5?.length)

  console.log('\n=== Test 6: Check forge columns on profiles ===')
  const { data: d6, error: e6 } = await supabase.from('profiles')
    .select('id,forge_rating_avg,total_gigs_completed,top_hustler')
    .limit(1)
  console.log('Error:', e6)
  console.log('Data:', d6)
}

testQuery()
