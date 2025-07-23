// /api/fetch-bookings.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.PUBLIC_SUPABASE_URL,           // same as your frontend
  process.env.SUPABASE_SERVICE_ROLE_KEY      // ONLY used here
);

export default async function handler(req, res) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.status(200).json(data);
}
