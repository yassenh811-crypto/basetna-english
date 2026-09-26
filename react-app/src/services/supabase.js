/* ============================================================
   🔌 supabase.js — الاتصال بـ Supabase
   ============================================================ */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://wgostqkywpybmzgbyzeo.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_zx0zeWR2bpbmyO90oN-4ow_FxZCSPl8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);