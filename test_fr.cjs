const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://oaqxcckxvlvpwsvmotqo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXhjY2t4dmx2cHdzdm1vdHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA4MTIyNywiZXhwIjoyMDk0NjU3MjI3fQ.-ExBH84Yy1v8IkgLpLTj-4wDy36oTEgdGnQKYB50U44');

async function test() {
  const { data, error } = await supabase.from('group_requests').select('*').limit(1);
  console.log("Group requests schema test:");
  if(data && data.length > 0) console.log(Object.keys(data[0])); else console.log("Empty or error:", error);
}
test();
