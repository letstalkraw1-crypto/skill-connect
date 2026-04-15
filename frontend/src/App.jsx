import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocketContext } from './context/SocketContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import InstallPrompt from './components/InstallPrompt';

// Lazy load pages for performance optimization
const Home = lazy(() => import('./pages/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const ProfileByShortId = lazy(() => import('./pages/ProfileByShortId'));
const Chat = lazy(() => import('./pages/Chat'));
const Discovery = lazy(() => import('./pages/Discovery'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Legal = lazy(() => import('./pages/Legal'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const Admin = lazy(() => import('./pages/Admin'));
const Challenges = lazy(() => import('./pages/Challenges'));
const Resources = lazy(() => import('./pages/Resources'));
const QARooms = lazy(() => import('./pages/QARooms'));
const DailyChallenge = lazy(() => import('./pages/DailyChallenge'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Progress = lazy(() => import('./pages/Progress'));

// Lightweight loading fallback
const LoadingFallback = () => (
  <div className="flex h-[calc(100vh-10rem)] items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <p className="text-primary font-bold animate-pulse uppercase tracking-widest text-xs">Loading...</p>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-primary">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  if (user.onboardingDone === false && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" />;
  }
  return children;
};

// Offline banner component
const OfflineBanner = () => {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;
  return (
    <div className="offline-banner">
      📡 You're offline — some features may not work
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <SocketProvider>
        <OfflineBanner />
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-20 md:pb-0">
          <Navbar />
          <main className="container mx-auto px-4 py-4 md:py-8">
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<OAuthCallback />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
                <Route path="/profile/:id" element={<PrivateRoute><ProfileByShortId /></PrivateRoute>} />
                <Route path="/u/:shortId" element={<PrivateRoute><ProfileByShortId /></PrivateRoute>} />
                <Route path="/chat/:id?" element={<PrivateRoute><Chat /></PrivateRoute>} />
                <Route path="/discovery" element={<PrivateRoute><Discovery /></PrivateRoute>} />
                <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
                <Route path="/challenges" element={<PrivateRoute><Challenges /></PrivateRoute>} />
                <Route path="/resources" element={<PrivateRoute><Resources /></PrivateRoute>} />
                <Route path="/qa" element={<PrivateRoute><QARooms /></PrivateRoute>} />
                <Route path="/daily-challenge" element={<PrivateRoute><DailyChallenge /></PrivateRoute>} />
                <Route path="/onboarding" element={<PrivateRoute><Onboarding /></PrivateRoute>} />
                <Route path="/progress" element={<PrivateRoute><Progress /></PrivateRoute>} />
                <Route path="/legal/:type" element={<Legal />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </Suspense>
          </main>
          <BottomNav />
          <InstallPrompt />
        </div>
      </SocketProvider>
    </AuthProvider>
  );
};

export default App;
