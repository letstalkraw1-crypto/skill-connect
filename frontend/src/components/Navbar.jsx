import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageSquare, User, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const location = useLocation();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-xl font-bold text-primary-foreground">S</span>
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:inline">SkillConnect</span>
        </Link>

        <div className="flex items-center gap-1 md:gap-4">
          <NavItem to="/" icon={Home} label="Feed" active={location.pathname === '/'} />
          <NavItem to="/discovery" icon={Search} label="Discover" active={location.pathname === '/discovery'} />
          <NavItem to="/chat" icon={MessageSquare} label="Messages" active={location.pathname.startsWith('/chat')} />
          <NavItem to={`/profile/${user._id || user.id}`} icon={User} label="Profile" active={location.pathname.startsWith('/profile')} />
        </div>

        <div className="flex items-center gap-2">
          <button className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-accent hover:text-foreground transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
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
  );
};

export default Navbar;
