import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import Discovery from './pages/Discovery';

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
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
            <Route path="/profile/:id" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/chat/:id?" element={<PrivateRoute><Chat /></PrivateRoute>} />
            <Route path="/discovery" element={<PrivateRoute><Discovery /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
    </AuthProvider>
  );
};

export default App;
