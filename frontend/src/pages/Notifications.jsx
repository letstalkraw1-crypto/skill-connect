import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/api';
import api from '../services/api';
import Avatar from '../components/Avatar';
import { safeDistanceToNow } from '../utils/utils';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await notificationService.getNotifications();
        setNotifications(data);
        // mark all as read
        await notificationService.markAsRead();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleAccept = async (n) => {
    try {
      await api.put(`/connections/${n.relatedId}/accept`);
      setNotifications(prev => prev.map(notif =>
        notif._id === n._id ? { ...notif, message: 'Connection accepted!', data: { handled: true } } : notif
      ));
    } catch (err) {
      alert('Failed to accept');
    }
  };

  const handleDecline = async (n) => {
    try {
      await api.put(`/connections/${n.relatedId}/decline`);
      setNotifications(prev => prev.filter(notif => notif._id !== n._id));
    } catch (err) {
      alert('Failed to decline');
    }
  };

  return (
    <div className="max-w-lg mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Bell size={24} className="text-primary" />
        <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="glass-card p-4 rounded-2xl animate-pulse flex gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/50" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-accent/50 rounded w-3/4" />
                <div className="h-2 bg-accent/30 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-4">
          <Bell size={48} className="opacity-20" />
          <p className="font-bold">No notifications yet</p>
          <p className="text-sm">When someone likes, comments or sends you a request, it'll show up here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n, idx) => (
            <motion.div
              key={n._id || idx}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`glass-card p-4 rounded-2xl border transition-all ${n.isRead ? 'border-border/30' : 'border-primary/30 bg-primary/5'}`}
            >
              <div className="flex items-start gap-3">
                <Avatar src={n.senderId?.avatarUrl} name={n.senderId?.name || '?'} size="10" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.message || 'New notification'}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                    {safeDistanceToNow(n.createdAt)}
                  </p>
                  {n.type === 'connection_request' && !n.data?.handled && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAccept(n)}
                        className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:scale-105 active:scale-95 transition-all"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleDecline(n)}
                        className="px-4 py-1.5 bg-accent text-foreground rounded-lg text-xs font-bold hover:bg-destructive hover:text-destructive-foreground transition-all"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
                {!n.isRead && <div className="h-2 w-2 rounded-full bg-primary mt-1 flex-shrink-0" />}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
