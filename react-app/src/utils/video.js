/* ============================================================
   🎞️ video — دوال مساعدة للفيديوهات (يوتيوب / فيميو / درايف / رابط)
   ============================================================ */
export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export function extractDriveId(url) {
  if (!url) return null;
  const m =
    url.match(/drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/) ||
    url.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

/* بيرجّع طريقة العرض: iframe أو video، أو null لو الرابط غلط */
export function getEmbed(type, url) {
  if (!url) return null;

  if (type === 'youtube') {
    const id = extractYouTubeId(url);
    return id ? { kind: 'iframe', src: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1` } : null;
  }
  if (type === 'vimeo') {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return m ? { kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}?autoplay=1&title=0&byline=0&portrait=0` } : null;
  }
  if (type === 'drive') {
    const id = extractDriveId(url);
    return id ? { kind: 'iframe', src: `https://drive.google.com/file/d/${id}/preview` } : null;
  }
  /* link / file */
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url)) return { kind: 'video', src: url };
  return { kind: 'iframe', src: url };
}