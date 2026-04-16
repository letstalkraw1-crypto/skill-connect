import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Mic2, Bell, User, TrendingUp, Search, MessageSquare, Users, BookOpen, MoreHorizontal, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const BottomNav = () => {
  const { user } = useAuth();
  const { on } = useSocketContext() || {};
  const location = useLocation();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [expanded, setExpanded] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const { data } = await api.get('/notifications');
        setUnreadCount(data.filter(n => !n.isRead).length);
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 60000);
    return () => clearInterval(interval);
  }, [user]);

  React.useEffect(() => {
    if (!on) return;
    const unsub = on('notification', () => setUnreadCount(c => c + 1));
    return () => unsub();
  }, [on]);

  if (!user) return null;

  const primaryItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/daily-challenge', icon: Mic2, label: 'Challenge' },
    { to: '/progress', icon: TrendingUp, label: 'Progress' },
    { to: `/profile/${user._id || user.id}`, icon: User, label: 'Profile' },
  ];

  const secondaryItems = [
    { to: '/discovery', icon: Search, label: 'Discovery' },
    { to: '/chat', icon: MessageSquare, label: 'Messages' },
    { to: '/communities', icon: Users, label: 'Communities' },
    { to: '/resources', icon: BookOpen, label: 'Resources' },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadCount > 0 ? unreadCount : null },
  ];

  return (
    <>
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border/40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-center justify-around h-16">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors min-h-[44px] ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                aria-label={`Navigate to ${item.label}`}
                role="button"
                tabIndex={0}>
                <div className="relative">
                  <Icon size={22} aria-hidden="true" />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center border-2 border-background font-bold"
                      aria-label={`${item.badge} unread notifications`}>
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
              </Link>
            );
          })}
          
          {/* More button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors min-h-[44px] ${expanded ? 'text-primary' : 'text-muted-foreground'}`}
            aria-label={expanded ? 'Close menu' : 'Open more options'}
            aria-expanded={expanded}
          >
            <div className="relative">
              {expanded ? <X size={22} aria-hidden="true" /> : <MoreHorizontal size={22} aria-hidden="true" />}
              {!expanded && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" aria-hidden="true"></span>
              )}
            </div>
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">More</span>
          </button>
        </div>
      </div>

      {/* Expanded menu */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/50"
              onClick={() => setExpanded(false)}
            />
            
            {/* Expanded menu */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="md:hidden fixed bottom-16 left-0 right-0 z-50 bg-background border-t border-border"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="grid grid-cols-3 gap-1 p-4">
                {secondaryItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setExpanded(false)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl transition-colors min-h-[80px] ${
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'
                      }`}
                      aria-label={`Navigate to ${item.label}`}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="relative mb-2">
                        <Icon size={24} aria-hidden="true" />
                        {item.badge && (
                          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center border-2 border-background font-bold"
                            aria-label={`${item.badge} unread notifications`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-medium text-center">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default BottomNav;
