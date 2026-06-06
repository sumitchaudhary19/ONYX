const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://oaqxcckxvlvpwsvmotqo.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXhjY2t4dmx2cHdzdm1vdHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA4MTIyNywiZXhwIjoyMDk0NjU3MjI3fQ.-ExBH84Yy1v8IkgLpLTj-4wDy36oTEgdGnQKYB50U44');

async function test() {
  const { data, error } = await supabase.from('post_comments').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log("Empty fetch successful, checking REST API options for schema introspection...");
    const res = await fetch('https://oaqxcckxvlvpwsvmotqo.supabase.co/rest/v1/post_comments?limit=1', {
      method: 'OPTIONS',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9hcXhjY2t4dmx2cHdzdm1vdHFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTA4MTIyNywiZXhwIjoyMDk0NjU3MjI3fQ.-ExBH84Yy1v8IkgLpLTj-4wDy36oTEgdGnQKYB50U44',
      }
    });
    const schema = await res.json();
    console.log(JSON.stringify(schema, null, 2));
  }
}
test();
