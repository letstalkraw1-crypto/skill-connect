import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageSquare, User, LogOut, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import CreateModal from './CreateModal';

const NavItem = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
      active
        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
    }`}
  >
    <Icon size={20} />
    <span className="hidden md:inline font-medium">{label}</span>
  </Link>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const [showCreate, setShowCreate] = React.useState(false);
  const location = useLocation();

  if (!user) return null;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
            <img
              src="/logo.png"
              alt="Collabro Logo"
              className="h-8 w-8 object-contain"
              fetchpriority="high"
              loading="eager"
            />
            <span className="text-xl font-bold tracking-tight hidden sm:inline">Collabro</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 ml-8 flex-1">
            <NavItem to="/" icon={Home} label="Home" active={location.pathname === '/'} />
            <NavItem to="/discovery" icon={Search} label="Discover" active={location.pathname.startsWith('/discovery')} />
            <NavItem to="/chat" icon={MessageSquare} label="Messages" active={location.pathname.startsWith('/chat')} />
            <NavItem to={`/profile/${user._id || user.id}`} icon={User} label="Profile" active={location.pathname.startsWith('/profile')} />
          </div>

          <div className="flex items-center gap-2">
            {/* + Create Button */}
            <button
              onClick={() => setShowCreate(true)}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
              title="Create Event or Community"
            >
              <Plus size={22} />
            </button>

            <div className="h-8 w-[1px] bg-border mx-2 hidden sm:block"></div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
