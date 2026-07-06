import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OfflineProvider } from './context/OfflineContext';
import { Login } from './pages/login';
import { GuardDashboard } from './pages/guard/dashboard';
import { VisitorForm } from './pages/guard/visitor-form';
import { ExitScan } from './pages/guard/exit-scan';
import { ApproverDashboard } from './pages/approver/dashboard';
import { AdminDashboard } from './pages/admin/dashboard';
import { PublicApprovalPage } from './pages/public-approval';
import { RefreshCw } from 'lucide-react';

const NavigationContainer: React.FC = () => {
  const { isAuthenticated, isGuard, isAdmin, isApprover, isLoading } = useAuth();
  
  // Guard local page state: 'dashboard' | 'visitor-form' | 'exit-scan' | 'visitor-checkin:requestId'
  const [guardPage, setGuardPage] = useState<string>('dashboard');
  const [overrideRequestId, setOverrideRequestId] = useState<string | undefined>(undefined);

  // Initialize theme on mount
  React.useEffect(() => {
    const activeTheme = localStorage.getItem('abes-theme') || 'cyber-dark';
    document.body.classList.remove('theme-light', 'theme-corporate');
    if (activeTheme === 'light') document.body.classList.add('theme-light');
    if (activeTheme === 'corporate-abes') document.body.classList.add('theme-corporate');
  }, []);

  // Check if we are visiting the public Quick Approval route from WhatsApp
  const pathname = window.location.pathname;
  if (pathname.startsWith('/approve-request/')) {
    const requestId = pathname.split('/').pop() || '';
    return <PublicApprovalPage requestId={requestId} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-10 h-10 animate-spin text-brand-500 mb-4" />
        <p className="text-xs font-semibold uppercase tracking-wider">Verifying Session credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  // Role Based Routing
  if (isGuard) {
    const handleNavigate = (page: string) => {
      if (page.startsWith('visitor-checkin:')) {
        const id = page.split(':')[1];
        setOverrideRequestId(id);
        setGuardPage('visitor-form');
      } else {
        setOverrideRequestId(undefined);
        setGuardPage(page);
      }
    };

    const handleBack = () => {
      setGuardPage('dashboard');
      setOverrideRequestId(undefined);
    };

    if (guardPage === 'visitor-form') {
      return <VisitorForm onBack={handleBack} overrideRequestId={overrideRequestId} />;
    }

    if (guardPage === 'exit-scan') {
      return <ExitScan onBack={handleBack} />;
    }

    return <GuardDashboard onNavigate={handleNavigate} />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  if (isApprover) {
    return <ApproverDashboard />;
  }

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col items-center justify-center text-slate-400">
      <p className="text-sm font-semibold">Error: Role unrecognized or account deactivated.</p>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <OfflineProvider>
        <NavigationContainer />
      </OfflineProvider>
    </AuthProvider>
  );
}

export default App;
