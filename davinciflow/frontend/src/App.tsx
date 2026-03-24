import { useEffect, useState } from 'react';
import DesignerPage from './pages/DesignerPage';
import ConnectionsPage from './pages/ConnectionsPage';
import LoginPage from './pages/LoginPage';
import { getAuthSession, login, logout, type AuthSession } from './api/auth';
import { usePathname } from './utils/navigation';

export default function App() {
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const nextSession = await getAuthSession();
        setSession(nextSession);
      } catch {
        setSession({ auth_enabled: true, authenticated: false, username: null });
      } finally {
        setIsLoading(false);
      }
    };

    void loadSession();

    const handleAuthRequired = () => {
      setSession({ auth_enabled: true, authenticated: false, username: null });
      setIsLoading(false);
    };

    window.addEventListener('davinciflow:auth-required', handleAuthRequired);
    return () => window.removeEventListener('davinciflow:auth-required', handleAuthRequired);
  }, []);

  const handleLogin = async (username: string, password: string) => {
    const nextSession = await login(username, password);
    setSession(nextSession);
  };

  const handleLogout = async () => {
    const nextSession = await logout();
    setSession(nextSession);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-sm uppercase tracking-[0.3em] text-slate-400">
        Loading workspace
      </div>
    );
  }

  if (!session?.authenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return pathname === '/connections' ? (
    <ConnectionsPage authUsername={session.username ?? undefined} onLogout={handleLogout} />
  ) : (
    <DesignerPage authUsername={session.username ?? undefined} onLogout={handleLogout} />
  );
}
