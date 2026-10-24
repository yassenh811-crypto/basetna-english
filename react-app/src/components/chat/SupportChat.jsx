/* ============================================================
   SupportChat — محادثة دعم خاصة
   - الأونر:  <SupportChat studentId={طالب} viewerRole="owner" />
   - الطالب:  <SupportChat studentId={profile.id} viewerRole="student" />
   ============================================================ */
import { useEffect, useState } from 'react';
import { useT } from '../../i18n/useT';
import { chatLabels, chatLocale } from '../../i18n/chatLabels';
import { useSupportThread } from '../../hooks/useSupportThread';
import ChatBox from './ChatBox';

function SupportChat({ studentId, viewerRole, onRead }) {
  const { lang } = useT();
  const L = chatLabels(lang);
  const { messages, loading, error, send, markRead } = useSupportThread(studentId, viewerRole);
  const [visibleTick, setVisibleTick] = useState(0);

  /* لما الشخص يرجع للتاب نعلّم الرسايل مقروءة */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') setVisibleTick((n) => n + 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  useEffect(() => {
    const hasIncomingUnread = messages.some((m) => m.sender_role !== viewerRole && !m.read_at);
    if (!hasIncomingUnread || document.visibilityState !== 'visible') return;
    markRead().then(() => {
      if (onRead) onRead();
    });
  }, [messages, viewerRole, markRead, onRead, visibleTick]);

  return (
    <ChatBox
      messages={messages}
      loading={loading}
      error={error}
      isMine={(m) => m.sender_role === viewerRole}
      onSend={send}
      labels={L}
      locale={chatLocale(lang)}
      showReceipts
      emptyText={viewerRole === 'owner' ? L.emptyOwnerThread : L.emptyStudentThread}
    />
  );
}

export default SupportChat;