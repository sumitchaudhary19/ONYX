const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://oaqxcckxvlvpwsvmotqo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXhjY2t4dmx2cHdzdm1vdHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA4MTIyNywiZXhwIjoyMDk0NjU3MjI3fQ.-ExBH84Yy1v8IkgLpLTj-4wDy36oTEgdGnQKYB50U44');

async function test() {
  const { data, error } = await supabase.from('friend_requests').select('*');
  console.log("Friend requests:", data);
  if (error) console.error("Error:", error);
}
test();
