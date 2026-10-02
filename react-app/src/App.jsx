/* ============================================================
   🚀 App.jsx — التطبيق الرئيسي
   ============================================================ */
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { ChatProvider } from './context/ChatContext';
import { AIChatProvider } from './context/AIChatContext';
import { useRole } from './hooks/useRole';

/* Components */
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppFloat from './components/WhatsAppFloat';
import SupportFabs from './components/SupportFabs';
import WelcomeModal from './components/WelcomeModal';
import AuthModal from './components/AuthModal';
import SupportModal from './components/SupportModal';
import AIChat from './components/AIChat';

/* Pages */
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';

/* ============================================================
   🛡️ Protected Admin
   ============================================================ */
function ProtectedAdmin({ children }) {
  const { loading } = useAuth();
  const { isAdmin } = useRole();

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: 80 }}>
        جاري التحميل...
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

/* ============================================================
   🛡️ Protected Student
   ============================================================ */
function ProtectedStudent({ children }) {
  const { loading } = useAuth();
  const { isStudent, isAdmin } = useRole();

  if (loading) {
    return (
      <div className="empty-state" style={{ padding: 80 }}>
        جاري التحميل...
      </div>
    );
  }
  /* الأدمن يقدر يدخل برضه (للمعاينة) */
  if (!isStudent && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

/* ============================================================
   🔄 AutoRedirect — يوجه المستخدم تلقائياً حسب دوره
   ============================================================ */
function AutoRedirect() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isStudent, profile } = useRole();
  const location = useLocation();

  useEffect(() => {
    if (authLoading || !profile) return;
    if (location.pathname !== '/') return;

    if (isAdmin) {
      window.location.replace('/admin');
      return;
    }
    if (isStudent) {
      window.location.replace('/student');
    }
  }, [authLoading, profile, isAdmin, isStudent, location.pathname]);

  return null;
}

/* ============================================================
   🧩 AppContent
   ============================================================ */
function AppContent() {
  const location = useLocation();
  const isDashboard =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/student');

  return (
    <>
      {/* AutoRedirect: يوجه المستخدم تلقائياً */}
      <AutoRedirect />

      {/* Navbar: يظهر بس في الصفحات العامة */}
      {!isDashboard && <Navbar />}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedAdmin>
              <AdminDashboard />
            </ProtectedAdmin>
          }
        />
        <Route
          path="/student"
          element={
            <ProtectedStudent>
              <StudentDashboard />
            </ProtectedStudent>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* Footer + Support + WhatsApp + AI: بس في الصفحات العامة */}
      {!isDashboard && <Footer />}

{/* الأزرار العائمة: في كل الصفحات ما عدا Navbar في الداشبورد */}
<WhatsAppFloat />
<SupportFabs />
<AIChat />

      {/* Modals: دايماً موجودة */}
      <WelcomeModal />
      <AuthModal />
      <SupportModal />
    </>
  );
}

/* ============================================================
   🚀 App
   ============================================================ */
function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <ChatProvider>
          <AIChatProvider>
            <AppContent />
          </AIChatProvider>
        </ChatProvider>
      </AuthProvider>
    </UIProvider>
  );
}

export default App;