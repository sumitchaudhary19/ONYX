const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oaqxcckxvlvpwsvmotqo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXhjY2t4dmx2cHdzdm1vdHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA4MTIyNywiZXhwIjoyMDk0NjU3MjI3fQ.-ExBH84Yy1v8IkgLpLTj-4wDy36oTEgdGnQKYB50U44';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log("Testing connection...");
  
  // 1. Try to fetch from post_comments
  const { data, error } = await supabase.from('post_comments').select('*').limit(1);
  console.log("Post comments fetch result:");
  console.log("Data:", data);
  console.log("Error:", error);

  // 2. Try to insert a dummy comment (will probably fail foreign key, but we'll see the error)
  const { error: insertError } = await supabase.from('post_comments').insert({
    content: 'test',
    user_id: '00000000-0000-0000-0000-000000000000',
    post_id: '00000000-0000-0000-0000-000000000000'
  });
  console.log("Insert error:", insertError);
}

test();
