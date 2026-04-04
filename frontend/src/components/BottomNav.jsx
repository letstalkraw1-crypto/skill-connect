import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, MessageSquare, User, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const BottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = React.useState(0);

  const fetchUnreadCount = async () => {
    try {
      const { data } = await api.get('/notifications');
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/discovery', icon: Search, label: 'Discover' },
    { to: '/chat', icon: MessageSquare, label: 'Messages' },
    { to: `/profile/${user._id || user.id}`, icon: User, label: 'Profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t border-border/40 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon size={24} />
                {item.label === 'Messages' && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background"></span>
                )}
              </div>
              <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">{item.label}</span>
            </Link>
          );
        })}
        {/* Simple Notification Indicator for Mobile Footer */}
        <Link
          to={`/profile/${user._id || user.id}?tab=activity`}
          className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
            location.search.includes('tab=activity') ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="relative">
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center border-2 border-background">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Activity</span>
        </Link>
      </div>
    </div>
  );
};

export default BottomNav;
