import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageSquare, User, LogOut, Bell, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../utils/utils';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [showNotifications, setShowNotifications] = React.useState(false);
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

        <div className="flex items-center gap-2 relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors relative ${showNotifications ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-foreground'}`}
          >
            <Bell size={20} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-2 w-80 glass-card p-4 rounded-2xl border border-border z-50 shadow-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-accent rounded-lg">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer group border border-transparent hover:border-border/50">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <User size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">New connection request from a skilled peer!</p>
                        <p className="text-[10px] text-muted-foreground font-bold mt-1 uppercase tracking-tight">2 hours ago</p>
                      </div>
                    </div>
                  ))}
                  <button className="w-full py-2 text-xs font-bold text-primary hover:underline uppercase tracking-widest">View All</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
