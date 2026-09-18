import { createClient } from '@supabase/supabase-js';
const c = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY ?? 'sb_publishable_csj8J8qgUkbmNwFgTBAykA_ObAJY_YK');
const { data, error } = await c.from('listings').select('id,slug,title,seller_id').limit(3);
console.log(JSON.stringify(data ?? error));
