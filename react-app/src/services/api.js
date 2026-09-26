/* ============================================================
   📡 api.js — دوال جلب البيانات من Supabase
   ============================================================ */
import { supabase } from './supabase';

/* المراحل الدراسية */
export async function getLevels() {
  const { data, error } = await supabase
    .from('grade_levels')
    .select('*')
    .order('sort_order');
  if (error) throw error;
  return data || [];
}

/* الباقات */
export async function getPackages() {
  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('is_active', true);
  if (error) throw error;
  return data || [];
}

/* عدد الكورسات */
export async function getCourseCount() {
  const { data, error } = await supabase.rpc('get_course_count');
  if (error) return 0;
  return data || 0;
}