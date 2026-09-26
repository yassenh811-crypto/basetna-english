/* ============================================================
   🎭 useRole — تحديد دور المستخدم
   ============================================================ */
import { useAuth } from '../context/AuthContext';

const ADMIN_ROLES = ['superadmin', 'owner', 'support'];

export function useRole() {
  const { profile } = useAuth();

  /* ✅ Debug: اطبع الـ profile عشان نتأكد */
  console.log('🎭 [useRole] profile:', profile);
  console.log('🎭 [useRole] role:', profile?.role);

  if (!profile) {
    return {
      role: null,
      isAdmin: false,
      isStudent: false,
      isYassen: false,
      profile: null,
    };
  }

  const role = profile.role;
  const isAdmin = ADMIN_ROLES.includes(role);
  const isStudent = role === 'student';
  const isYassen =
    profile.full_name &&
    (profile.full_name.includes('Yassen') || profile.full_name.includes('ياسين'));

  console.log('🎭 [useRole] isAdmin:', isAdmin);

  return { role, isAdmin, isStudent, isYassen, profile };
}