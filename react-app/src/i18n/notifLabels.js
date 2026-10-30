/* ============================================================
   notifLabels.js — نصوص الإشعارات والأرشيف (عربي / English)
   describeNotification(n, audience, lang) → { icon, title, body }
   النص بيتكوّن هنا من نوع الحدث وبياناته، فبيظهر بلغة الموقع الحالية
   ============================================================ */

/* تصنيفات الأرشيف (للفلتر) */
export const CATEGORY_TYPES = {
  payments: ['payment_new', 'payment_submitted', 'payment_approved', 'payment_rejected'],
  messages: ['message_new'],
  accounts: ['signup_new', 'account_locked', 'account_unlocked'],
  changes: ['admin_change'],
};

const AR = {
  tab: 'الإشعارات والأرشيف',
  title: 'الإشعارات والأرشيف',
  sub: 'كل اللي بيحصل في المنصة. اللي تشوفيه بيختفي من «الجديد» ويفضل في الأرشيف.',
  studentTab: 'إشعاراتي',
  studentTitle: 'إشعاراتي',
  studentSub: 'آخر الأخبار عن اشتراكك وتحويلاتك ورسايلك. اللي تقراه بيروح للأرشيف.',
  tabUnread: 'الجديد',
  tabArchive: 'الأرشيف',
  markAll: '✓ تعليم الكل كمقروء',
  markAllNote: 'تعليم الكل بيعلّم رسايل الطلاب كمقروءة كمان، فبيظهرلهم «اتقرأت» على رسايلهم.',
  markOne: 'تعليم كمقروء',
  empty: 'مفيش إشعارات جديدة 🎉',
  emptyArchive: 'الأرشيف فاضي.',
  catAll: 'الكل',
  catPayments: 'التحويلات',
  catMessages: 'الرسايل',
  catAccounts: 'الحسابات',
  catChanges: 'تعديلات المحتوى',
  search: 'ابحث بالاسم أو الباقة…',
  loadMore: 'تحميل المزيد',
  loading: 'جاري التحميل…',
  loadFail: 'ماقدرناش نحمّل الإشعارات. اتأكد إنك شغّلت ملف notifications_and_archive.sql في المشروع الصح.',
  unreadN: (n) => `${n} إشعار جديد`,
  newBadge: 'جديد',
  /* وصف الأحداث */
  currency: 'جنيه',
  until: 'لحد',
  reason: 'السبب',
  newMessages: (n) => `${n} رسائل جديدة`,
  entity: { course: 'كورس', package: 'باقة', level: 'مرحلة' },
  action: { insert: 'اتضاف', update: 'اتعدّل', delete: 'اتحذف' },
  lockedHint: 'كلّم مس شيرهان من الدعم عشان تفتحه.',
};

const EN = {
  tab: 'Notifications & archive',
  title: 'Notifications & archive',
  sub: 'Everything that happens on the platform. What you see leaves "New" and stays in the archive.',
  studentTab: 'My notifications',
  studentTitle: 'My notifications',
  studentSub: 'Latest news about your subscription, transfers and messages. What you read moves to the archive.',
  tabUnread: 'New',
  tabArchive: 'Archive',
  markAll: '✓ Mark all as read',
  markAllNote: 'Mark all also marks student messages as read, so students see "seen" on their messages.',
  markOne: 'Mark as read',
  empty: 'No new notifications 🎉',
  emptyArchive: 'The archive is empty.',
  catAll: 'All',
  catPayments: 'Payments',
  catMessages: 'Messages',
  catAccounts: 'Accounts',
  catChanges: 'Content changes',
  search: 'Search by name or package…',
  loadMore: 'Load more',
  loading: 'Loading…',
  loadFail: "Couldn't load notifications. Make sure you ran notifications_and_archive.sql in the right project.",
  unreadN: (n) => `${n} new ${n === 1 ? 'notification' : 'notifications'}`,
  newBadge: 'New',
  currency: 'EGP',
  until: 'until',
  reason: 'Reason',
  newMessages: (n) => `${n} new messages`,
  entity: { course: 'Course', package: 'Package', level: 'Stage' },
  action: { insert: 'added', update: 'edited', delete: 'deleted' },
  lockedHint: 'Message Miss Sherhan in Support to get it unlocked.',
};

export function notifLabels(lang) {
  return lang === 'en' ? EN : AR;
}

function join(parts) {
  return parts.filter(Boolean).join(' — ');
}

export function describeNotification(n, audience, lang) {
  const N = notifLabels(lang);
  const ar = lang !== 'en';
  const d = n.data || {};
  const name = d.name || '';
  const money = d.amount != null && d.amount !== '' ? `${d.amount} ${N.currency}` : '';
  const until = d.until ? `${N.until} ${d.until}` : '';
  const note = d.note ? `${N.reason}: ${d.note}` : '';
  const count = Number(d.count || n.cnt || 1);
  const msgBody = count > 1 ? N.newMessages(count) : d.preview || '';
  const isAdmin = audience === 'admin';

  switch (n.type) {
    case 'payment_new':
      return { icon: '💳', title: ar ? `تحويل جديد من ${name}` : `New transfer from ${name}`, body: join([d.package, money]) };
    case 'payment_submitted':
      return { icon: '📨', title: ar ? 'وصلنا طلب التحويل' : 'We received your transfer', body: d.package || '' };
    case 'payment_approved':
      return isAdmin
        ? { icon: '✅', title: ar ? `اتفعّل اشتراك ${name}` : `Activated ${name}'s subscription`, body: join([d.package, until]) }
        : { icon: '✅', title: ar ? 'اشتراكك اتفعّل' : 'Your subscription is active', body: join([d.package, until]) };
    case 'payment_rejected':
      return isAdmin
        ? { icon: '❌', title: ar ? `اترفض تحويل ${name}` : `Rejected ${name}'s transfer`, body: join([d.package, note]) }
        : { icon: '❌', title: ar ? 'التحويل اترفض' : 'Your transfer was rejected', body: join([d.package, note]) };
    case 'message_new':
      return isAdmin
        ? { icon: '💬', title: ar ? `رسالة جديدة من ${name}` : `New message from ${name}`, body: msgBody }
        : { icon: '💬', title: ar ? 'رسالة جديدة من مس شيرهان' : 'New message from Miss Sherhan', body: msgBody };
    case 'signup_new':
      return { icon: '👤', title: ar ? `حساب جديد: ${name}` : `New account: ${name}`, body: '' };
    case 'account_locked':
      return isAdmin
        ? { icon: '🔒', title: ar ? `اتقفل حساب ${name}` : `Locked ${name}'s account`, body: '' }
        : { icon: '🔒', title: ar ? 'حسابك اتقفل' : 'Your account was locked', body: N.lockedHint };
    case 'account_unlocked':
      return isAdmin
        ? { icon: '🔓', title: ar ? `اتفتح حساب ${name}` : `Unlocked ${name}'s account`, body: '' }
        : { icon: '🔓', title: ar ? 'حسابك اتفتح' : 'Your account was unlocked', body: '' };
    case 'admin_change': {
      const ent = N.entity[d.entity] || d.entity || '';
      const act = N.action[d.action] || d.action || '';
      return { icon: '🛠️', title: ar ? `${ent} ${act}` : `${ent} ${act}`, body: name };
    }
    default:
      return { icon: '🔔', title: n.type, body: '' };
  }
}