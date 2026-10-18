/* ============================================================
   🎭 useRole — تحديد دور المستخدم
   ============================================================ */
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const ADMIN_ROLES = ['superadmin', 'owner', 'support'];

export function useRole() {
  const { profile } = useAuth();

  return useMemo(() => {
    if (!profile) {
      return { role: null, isAdmin: false, isStudent: false, isYassen: false, profile: null };
    }

    const role = profile.role;
    const name = profile.full_name || '';

    return {
      role,
      isAdmin: ADMIN_ROLES.includes(role),
      isStudent: role === 'student',
      isYassen: name.includes('Yassen') || name.includes('ياسين'),
      profile,
    };
  }, [profile]);
}