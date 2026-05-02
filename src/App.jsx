import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
// Add page imports here
import Dashboard from './pages/Dashboard.jsx';
import ContractsPage from './pages/ContractsPage.jsx';
import Portal from './pages/Portal';
import ClientPortal from './pages/ClientPortal.jsx';
import Onboarding from './pages/Onboarding';
import LeadsPage from './pages/LeadsPage';
import ScriptAnalytics from './pages/ScriptAnalytics';
import ContentCalendar from './pages/ContentCalendar';
import EditorPortal from './pages/EditorPortal';
import AssetLibrary from './pages/AssetLibrary';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, user, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Portal and client portal bypass auth requirement
  if (window.location.pathname.startsWith('/portal') || window.location.pathname.startsWith('/client-portal') || window.location.pathname.startsWith('/editor-portal')) {
    return (
      <Routes>
        <Route path="/portal" element={<Portal />} />
        <Route path="/client-portal" element={<ClientPortal />} />
        <Route path="/editor-portal" element={<EditorPortal />} />
      </Routes>
    );
  }

  // Handle authentication errors — only send non-admins to onboarding
  if (authError && (authError.type === 'user_not_registered' || authError.type === 'auth_required')) {
    // If user is admin, let them access the dashboard
    if (user?.role === 'admin') {
      return (
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/*" element={<Dashboard />} />
        </Routes>
      );
    }
    // Non-admins go to onboarding
    return (
      <Routes>
        <Route path="*" element={<Onboarding />} />
      </Routes>
    );
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/admin-login" element={<Onboarding />} />
      <Route path="/editor-portal" element={<EditorPortal />} />
      <Route path="/leads" element={<LeadsPage />} />

      <Route path="/script-analytics" element={<ScriptAnalytics />} />
      <Route path="/content-calendar" element={<ContentCalendar />} />
      <Route path="/" element={<Navigate to="/projects" replace />} />
      <Route path="/*" element={<Dashboard />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App