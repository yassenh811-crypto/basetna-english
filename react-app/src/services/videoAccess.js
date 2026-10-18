/* ============================================================
   🔐 videoAccess — روابط مؤقتة للفيديوهات (Signed URL)
   ============================================================ */
import { supabase } from './supabase';

/* رابط مؤقت (60 دقيقة) */
export async function getSignedVideoUrl(filePath, expiresIn = 3600) {
  try {
    const { data, error } = await supabase.storage
      .from('course-files')
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  } catch (err) {
    console.error('❌', err);
    return null;
  }
}