/* ============================================================
   🎭 ActingAsContext — اختيار صفة الرد (دعم فني / مدير عام)
   بيشتغل لحساب واحد بس: yassenq14232@gmail.com
   ============================================================ */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

export const OWNER_EMAIL = 'yassenq14232@gmail.com';

export const ACTING_OPTIONS = {
  support: { role: 'support', label: 'دعم فني', icon: '🛠️', desc: 'ترد على الناس بصفة الدعم الفني' },
  superadmin: { role: 'superadmin', label: 'مدير عام', icon: '👑', desc: 'ترد بصفة المدير العام' },
};

const KEY = 'acting_as';
const SEEN = 'acting_as_seen';

const ActingAsContext = createContext({
  isOwnerAccount: false,
  actingAs: null,
  actingInfo: null,
  setActingAs: () => {},
  showPicker: false,
  openPicker: () => {},
  closePicker: () => {},
});

export function ActingAsProvider({ children }) {
  const { user, profile } = useAuth();
  const email = (user?.email || profile?.email || '').toLowerCase();
  const isOwnerAccount = email === OWNER_EMAIL;

  const [choice, setChoice] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY);
      return ACTING_OPTIONS[saved] ? saved : 'superadmin';
    } catch {
      return 'superadmin';
    }
  });
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    if (!isOwnerAccount) {
      setShowPicker(false);
      return;
    }
    try {
      if (!sessionStorage.getItem(SEEN)) setShowPicker(true);
    } catch {
      setShowPicker(true);
    }
  }, [isOwnerAccount]);

  const markSeen = () => {
    try { sessionStorage.setItem(SEEN, '1'); } catch {}
  };

  const setActingAs = useCallback((v) => {
    if (!ACTING_OPTIONS[v]) return;
    setChoice(v);
    try { localStorage.setItem(KEY, v); } catch {}
    markSeen();
    setShowPicker(false);
  }, []);

  const openPicker = useCallback(() => setShowPicker(true), []);
  const closePicker = useCallback(() => {
    markSeen();
    setShowPicker(false);
  }, []);

  const value = useMemo(
    () => ({
      isOwnerAccount,
      actingAs: isOwnerAccount ? choice : null,
      actingInfo: isOwnerAccount ? ACTING_OPTIONS[choice] : null,
      setActingAs,
      showPicker: isOwnerAccount && showPicker,
      openPicker,
      closePicker,
    }),
    [isOwnerAccount, choice, showPicker, setActingAs, openPicker, closePicker]
  );

  return <ActingAsContext.Provider value={value}>{children}</ActingAsContext.Provider>;
}

export function useActingAs() {
  return useContext(ActingAsContext);
}