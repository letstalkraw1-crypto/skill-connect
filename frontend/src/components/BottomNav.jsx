import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, MessageSquare, Bell, User, Grid3X3, Trophy, BookOpen, MessageCircleQuestion, Users, Search, X, Video, Mic2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const BottomNav = () => {
  const { user } = useAuth();
  const { on } = useSocketContext() || {};
  const location = useLocation();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadMessages, setUnreadMessages] = React.useState(0);
  const [showMore, setShowMore] = React.useState(false);

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
    const unsubNotif = on('notification', () => setUnreadCount(c => c + 1));
    const unsubMsg = on('receive_message', () => {
      if (!window.location.pathname.startsWith('/chat')) {
        setUnreadMessages(c => c + 1);
      }
    });
    return () => { unsubNotif(); unsubMsg(); };
  }, [on]);

  React.useEffect(() => {
    if (location.pathname.startsWith('/chat')) setUnreadMessages(0);
    setShowMore(false); // close more menu on navigation
  }, [location.pathname]);

  if (!user) return null;

  const mainNav = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/daily-challenge', icon: Mic2, label: 'Challenge' },
    { to: '/chat', icon: MessageSquare, label: 'Messages', dot: unreadMessages > 0 },
    { to: '/notifications', icon: Bell, label: 'Activity', badge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : null },
  ];

  const moreItems = [
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/challenges', icon: Trophy, label: 'Challenges' },
    { to: '/resources', icon: BookOpen, label: 'Resources' },
    { to: '/qa', icon: MessageCircleQuestion, label: 'Q&A' },
    { to: '/webinar', icon: Video, label: 'Webinar' },
    { to: '/communities', icon: Users, label: 'Communities' },
    { to: '/discovery', icon: Search, label: 'Discover' },
    { to: `/profile/${user._id || user.id}`, icon: User, label: 'Profile' },
  ];

  const isMoreActive = moreItems.some(item => location.pathname.startsWith(item.to));

  return (
    <>
      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowMore(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="md:hidden fixed bottom-20 left-4 right-4 z-50 bg-background border border-border rounded-2xl shadow-2xl p-4"
            >
              <div className="grid grid-cols-3 gap-3">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.to);
                  return (
                    <Link key={item.to} to={item.to}
                      className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-accent text-muted-foreground'}`}>
                      <Icon size={22} />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border/40 pb-safe">
        <div className="flex items-center justify-around h-16">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className="relative">
                  <Icon size={22} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[9px] text-white flex items-center justify-center border-2 border-background font-bold">
                      {item.badge}
                    </span>
                  )}
                  {item.dot && !item.badge && (
                    <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background"></span>
                  )}
                </div>
                <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
              </Link>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setShowMore(s => !s)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${showMore || isMoreActive ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className="relative">
              {showMore ? <X size={22} /> : <Grid3X3 size={22} />}
              {isMoreActive && !showMore && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background"></span>
              )}
            </div>
            <span className="text-[9px] font-bold mt-1 uppercase tracking-tighter">More</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default BottomNav;
