import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageSquare, User, LogOut, Bell, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl, safeDistanceToNow } from '../utils/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import api from '../services/api';

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
  const [notifications, setNotifications] = React.useState([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const location = useLocation();

  const isFetchingBus = React.useRef(false);
  const [consecutiveErrors, setConsecutiveErrors] = React.useState(0);

  const fetchNotifications = async () => {
    if (isFetchingBus.current) return;
    isFetchingBus.current = true;
    try {
      const { data } = await api.get('/notifications');
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
      setConsecutiveErrors(0); // Reset on success
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setConsecutiveErrors(prev => prev + 1);
    } finally {
      isFetchingBus.current = false;
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await api.post('/notifications/read');
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Stop polling after 5 consecutive errors to prevent spamming
      if (consecutiveErrors >= 5) {
        console.warn('[Notifications] Polling stopped due to repeated failures.');
        return;
      }

      // Exponential backoff: base 60s, increases with errors
      const baseInterval = 60000;
      const intervalDelay = baseInterval * Math.pow(2, Math.min(consecutiveErrors, 3)); 
      
      const interval = setInterval(fetchNotifications, intervalDelay);
      return () => clearInterval(interval);
    }
  }, [user, consecutiveErrors]);

  if (!user) return null;

  return (
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

        <div className="flex items-center gap-2 relative">
          <button 
            onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAsRead(); }}
            className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors relative ${showNotifications ? 'bg-primary text-primary-foreground' : 'hover:bg-accent hover:text-foreground'}`}
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background"></span>
            )}
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
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">No new notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n._id || n.id} className="p-3 rounded-xl hover:bg-accent/50 transition-colors border border-transparent hover:border-border/50">
                        <div className="flex gap-3 mb-2">
                          <Avatar src={n.senderId?.avatarUrl} name={n.senderId?.name} size="10" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{n.message || 'New activity'}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{safeDistanceToNow(n.createdAt)}</p>
                          </div>
                          {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary self-center"></div>}
                        </div>
                        
                        {n.type === 'connection_request' && !n.data?.handled && (
                          <div className="flex gap-2 ml-13 mt-2 pl-12">
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await api.put(`/connections/${n.relatedId}/accept`);
                                  setNotifications(notifications.map(notif => 
                                    notif._id === n._id ? { ...notif, message: 'Connection request accepted!', data: { handled: true } } : notif
                                  ));
                                } catch (err) {
                                  console.error(err);
                                  alert('Failed to accept request');
                                }
                              }}
                              className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-[10px] font-bold tracking-wider hover:scale-105 active:scale-95 transition-all"
                            >
                              ACCEPT
                            </button>
                            <button
                               onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await api.put(`/connections/${n.relatedId}/decline`);
                                  setNotifications(notifications.filter(notif => notif._id !== n._id));
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              className="px-4 py-1.5 bg-accent text-foreground hover:bg-destructive hover:text-destructive-foreground rounded-lg text-[10px] font-bold tracking-wider hover:scale-105 active:scale-95 transition-all"
                            >
                              DECLINE
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {notifications.length > 0 && (
                    <button className="w-full py-2 text-xs font-bold text-primary hover:underline uppercase tracking-widest">View All</button>
                  )}
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
