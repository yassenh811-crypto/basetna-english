/* ============================================================
   🚀 App.jsx
   ============================================================ */
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UIProvider } from './context/UIContext';
import { ChatProvider } from './context/ChatContext';
import { useRole } from './hooks/useRole';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppFloat from './components/WhatsAppFloat';
import SupportFabs from './components/SupportFabs';
import WelcomeModal from './components/WelcomeModal';
import AuthModal from './components/AuthModal';
import SupportModal from './components/SupportModal';

import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';

/* 🛡️ Protected Admin */
function ProtectedAdmin({ children }) {
  const { loading } = useAuth();
  const { isAdmin } = useRole();

  if (loading) return <div className="empty-state" style={{ padding: 80 }}>جاري التحميل...</div>;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}

/* 🛡️ Protected Student */
function ProtectedStudent({ children }) {
  const { loading } = useAuth();
  const { isStudent } = useRole();

  if (loading) return <div className="empty-state" style={{ padding: 80 }}>جاري التحميل...</div>;
  if (!isStudent) return <Navigate to="/" replace />;
  return children;
}

/* 🧩 AppContent */
function AppContent() {
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdminPage && <Navbar />}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/*" element={<ProtectedAdmin><AdminDashboard /></ProtectedAdmin>} />
        <Route path="/student" element={<ProtectedStudent><StudentDashboard /></ProtectedStudent>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isAdminPage && <Footer />}
      {!isAdminPage && <WhatsAppFloat />}
      {!isAdminPage && <SupportFabs />}

      <WelcomeModal />
      <AuthModal />
      <SupportModal />
    </>
  );
}

/* 🚀 App */
function App() {
  return (
    <UIProvider>
      <AuthProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </AuthProvider>
    </UIProvider>
  );
}

export default App;