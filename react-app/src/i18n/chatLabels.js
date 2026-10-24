/* ============================================================
   chatLabels.js — نصوص الدعم والجروب (عربي / English)
   مستقلة عن ملف الترجمة الأساسي عشان ماتعدّلش عليه
   الاستخدام:  const C = chatLabels(lang);
   ============================================================ */
const AR = {
  tabSupport: 'الدعم والمحادثات',
  tabGroup: 'الجروب العام',

  placeholder: 'اكتب رسالتك…',
  send: 'إرسال',
  sendFail: 'الرسالة ماتبعتتش',
  loading: 'جاري التحميل…',
  loadFail: 'ماقدرناش نحمّل الرسايل. اتأكد إنك شغّلت ملف chat_and_general_courses.sql في Supabase.',
  today: 'النهارده',
  yesterday: 'امبارح',
  teacher: 'المس',
  remove: 'حذف',
  confirmDelete: 'تحذف الرسالة دي؟',
  delivered: 'اتبعتت',
  seen: 'اتقرأت',

  /* الأونر */
  ownerTitle: 'محادثات الطلاب',
  ownerSub: 'ابعت لأي طالب ورد على رسايله من مكان واحد.',
  searchStudents: 'ابحث باسم الطالب أو رقمه…',
  filterAll: 'الكل',
  filterUnread: 'غير مقروء',
  noStudents: 'مفيش طلاب لسه. لما حد يسجّل هيظهر هنا.',
  noResults: 'مفيش نتايج مطابقة.',
  pickStudent: 'اختار طالب من القايمة عشان تبدأ المحادثة.',
  back: 'رجوع',
  whatsapp: 'واتساب',
  you: 'أنت',
  unreadN: (n) => `${n} رسالة جديدة`,
  emptyOwnerThread: 'لسه مفيش رسايل مع الطالب ده. ابعت أول رسالة.',

  /* الطالب */
  studentTitle: 'تواصل مع مس شيرهان',
  studentSub: 'اسأل عن اشتراكك أو كورساتك، وهترد عليك هنا.',
  emptyStudentThread: 'ابدأ المحادثة — اكتب سؤالك وهيوصل لمس شيرهان.',

  /* الجروب */
  groupTitle: 'الجروب العام',
  groupSub: 'كل الحسابات في مكان واحد — اسأل وشارك وتعلّموا مع بعض.',
  groupEmpty: 'الجروب لسه فاضي. اكتب أول رسالة.',
  groupLocked: 'الكتابة في الجروب متقفلة دلوقتي. مس شيرهان بس هي اللي تقدر تكتب.',
  lockWrite: 'قفل الكتابة للطلاب',
  unlockWrite: 'فتح الكتابة للطلاب',
  stateLocked: 'الكتابة متقفلة للطلاب',
  stateOpen: 'الكتابة مفتوحة للجميع',
  lockFail: 'ماقدرناش نغيّر الإعداد. اتأكد إنك شغّلت ملف chat_and_general_courses.sql.',
};

const EN = {
  tabSupport: 'Support chat',
  tabGroup: 'Community group',

  placeholder: 'Write your message…',
  send: 'Send',
  sendFail: 'Message was not sent',
  loading: 'Loading…',
  loadFail: "Couldn't load messages. Make sure you ran chat_and_general_courses.sql in Supabase.",
  today: 'Today',
  yesterday: 'Yesterday',
  teacher: 'Teacher',
  remove: 'Delete',
  confirmDelete: 'Delete this message?',
  delivered: 'Sent',
  seen: 'Seen',

  ownerTitle: 'Student conversations',
  ownerSub: 'Message any student and reply to their questions in one place.',
  searchStudents: 'Search by student name or phone…',
  filterAll: 'All',
  filterUnread: 'Unread',
  noStudents: 'No students yet. New sign-ups will show up here.',
  noResults: 'No matching students.',
  pickStudent: 'Pick a student from the list to start chatting.',
  back: 'Back',
  whatsapp: 'WhatsApp',
  you: 'You',
  unreadN: (n) => `${n} new ${n === 1 ? 'message' : 'messages'}`,
  emptyOwnerThread: 'No messages with this student yet. Send the first one.',

  studentTitle: 'Chat with Miss Sherhan',
  studentSub: 'Ask about your subscription or courses — she will reply here.',
  emptyStudentThread: 'Start the conversation — your question goes straight to Miss Sherhan.',

  groupTitle: 'Community group',
  groupSub: 'Every account in one place — ask, share and learn together.',
  groupEmpty: 'The group is empty. Write the first message.',
  groupLocked: 'Posting is closed right now. Only Miss Sherhan can write.',
  lockWrite: 'Lock posting for students',
  unlockWrite: 'Unlock posting for students',
  stateLocked: 'Posting is locked for students',
  stateOpen: 'Everyone can post',
  lockFail: "Couldn't change the setting. Make sure you ran chat_and_general_courses.sql.",
};

export function chatLabels(lang) {
  return lang === 'en' ? EN : AR;
}

export function chatLocale(lang) {
  return lang === 'en' ? 'en-GB' : 'ar-EG';
}