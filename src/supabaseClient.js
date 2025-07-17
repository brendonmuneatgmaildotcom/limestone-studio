import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://znqrncsncjngkkcqdbyh.supabase.co";
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY; // store in .env

export const supabase = createClient(supabaseUrl, supabaseKey);
