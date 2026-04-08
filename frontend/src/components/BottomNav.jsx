import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Calendar, MessageSquare, Bell, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import api from '../services/api';

const BottomNav = () => {
  const { user } = useAuth();
  const { on } = useSocketContext() || {};
  const location = useLocation();
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [unreadMessages, setUnreadMessages] = React.useState(0);

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

  // Clear message dot when user visits chat
  React.useEffect(() => {
    if (location.pathname.startsWith('/chat')) {
      setUnreadMessages(0);
    }
  }, [location.pathname]);

  if (!user) return null;

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/events', icon: Calendar, label: 'Events' },
    { to: '/chat', icon: MessageSquare, label: 'Messages', dot: unreadMessages > 0 },
    { to: '/notifications', icon: Bell, label: 'Activity', badge: unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : null },
    { to: `/profile/${user._id || user.id}`, icon: User, label: 'Profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border/40 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
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
      </div>
    </div>
  );
};

export default BottomNav;
