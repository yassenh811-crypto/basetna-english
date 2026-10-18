/* ============================================================
   🖼️ courseCover — بيرجّع صورة الكورس
   الأولوية: الصورة اللي رفعتها من الأدمن ← صورة الفيديو التقديمي (يوتيوب/درايف) ← null
   استخدمه في كارت الكورس بتاع الطالب وفي لوحة الأدمن.
   ============================================================ */
export function getCourseCover(course, size = 'w800') {
  if (!course) return null;
  if (course.thumbnail_url) return course.thumbnail_url;

  const { content_type: type, content_url: url } = course;
  if (!url) return null;

  if (type === 'youtube') {
    const m = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/
    );
    return m ? `https://img.youtube.com/vi/${m[1]}/hqdefault.jpg` : null;
  }
  if (type === 'drive') {
    const m =
      url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) ||
      url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)/);
    return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=${size}` : null;
  }
  return null;
}