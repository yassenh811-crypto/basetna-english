/* ============================================================
   🔐 AuthContext — إدارة تسجيل الدخول (مُصلَح)
   ============================================================ */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  /* ============================================================
     جلب الـ profile
     ============================================================ */
  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    console.log('🔍 [Auth] Loading profile for:', userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('❌ [Auth] Profile error:', error);
        setProfile(null);
        return;
      }

      console.log('✅ [Auth] Profile loaded:', data);
      setProfile(data);
    } catch (err) {
      console.error('❌ [Auth] Catch:', err);
      setProfile(null);
    }
  }, []);

  /* ============================================================
     التهيئة الأولية
     ============================================================ */
  useEffect(() => {
    let mounted = true;

    async function init() {
      console.log('🔍 [Auth] Init...');
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        console.log('🔍 [Auth] Session:', session?.user?.id);

        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('❌ [Auth] Init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    /* مراقبة التغييرات */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔍 [Auth] Auth change:', event, session?.user?.id);
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  /* ============================================================
     تسجيل دخول
     ============================================================ */
  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /* ============================================================
     تسجيل خروج
     ============================================================ */
  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }

  const value = {
    user,
    profile,
    loading,
    showAuthModal,
    setShowAuthModal,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}