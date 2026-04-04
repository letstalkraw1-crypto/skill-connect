import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import BottomNav from './components/BottomNav';

// Lazy load pages for performance optimization
const Home = lazy(() => import('./pages/Home'));
const Auth = lazy(() => import('./pages/Auth'));
const Profile = lazy(() => import('./pages/Profile'));
const Chat = lazy(() => import('./pages/Chat'));
const Discovery = lazy(() => import('./pages/Discovery'));

// Lightweight loading fallback
const LoadingFallback = () => (
  <div className="flex h-[calc(100vh-10rem)] items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <p className="text-primary font-bold animate-pulse uppercase tracking-widest text-xs">Initializing App...</p>
    </div>
  </div>
);

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-primary">Loading...</div>;
  return user ? children : <Navigate to="/auth" />;
};

const App = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300 pb-20 md:pb-0">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
              <Route path="/profile/:id" element={<PrivateRoute><Profile /></PrivateRoute>} />
              <Route path="/chat/:id?" element={<PrivateRoute><Chat /></PrivateRoute>} />
              <Route path="/discovery" element={<PrivateRoute><Discovery /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Suspense>
        </main>
        <BottomNav />
      </div>
    </AuthProvider>
  );
};

export default App;
