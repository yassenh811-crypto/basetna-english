/* ============================================================
   🔐 AuthContext — إدارة تسجيل الدخول
   ============================================================ */
import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('❌ [Auth] Profile error:', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function applySession(session) {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      if (mounted) setLoading(false);
    }

    supabase.auth
      .getSession()
      .then(({ data }) => applySession(data?.session))
      .catch((err) => {
        console.error('❌ [Auth] Init error:', err);
        if (mounted) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      /* مهم: ماينفعش نعمل await لأي نداء Supabase جوه الـ callback مباشرة
         (ممكن يعلّق الـ auth). بنأجّله بـ setTimeout عشان نتفادى الـ deadlock. */
      setTimeout(() => applySession(session), 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch (e) {}
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, showAuthModal, setShowAuthModal, signIn, signOut }),
    [user, profile, loading, showAuthModal, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}