import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion } from 'framer-motion';
import { notificationService } from '../services/api';
import api from '../services/api';
import Avatar from '../components/Avatar';
import { safeDistanceToNow } from '../utils/utils';
import { useSocketContext } from '../context/SocketContext';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [handled, setHandled] = useState(new Set());
  const { on } = useSocketContext() || {};

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await notificationService.getNotifications();
        const enriched = await Promise.all(data.map(async (n) => {
          if (n.type === 'connection_request' && n.relatedId) {
            try {
              const res = await api.get(`/connections/status/${n.relatedId}`);
              return { ...n, connectionStatus: res.data.status };
            } catch { return n; }
          }
          return n;
        }));
        setNotifications(enriched);
        await notificationService.markAsRead();
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Real-time: prepend new notifications instantly
  useEffect(() => {
    if (!on) return;
    const unsub = on('notification', (newNotif) => {
      setNotifications(prev => [{ ...newNotif, isRead: false, connectionStatus: 'pending' }, ...prev]);
    });
    return unsub;
  }, [on]);

  const handleAccept = async (n) => {
    try {
      await api.put(`/connections/${n.relatedId}/accept`);
      setHandled(prev => new Set([...prev, n._id]));
      setNotifications(prev => prev.map(notif =>
        notif._id === n._id
          ? { ...notif, message: `You are now connected with ${notif.senderId?.name || 'them'}!`, connectionStatus: 'accepted' }
          : notif
      ));
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to accept';
      alert(msg);
    }
  };

  const handleDecline = async (n) => {
    try {
      await api.put(`/connections/${n.relatedId}/decline`);
      setHandled(prev => new Set([...prev, n._id]));
      setNotifications(prev => prev.map(notif =>
        notif._id === n._id
          ? { ...notif, message: 'Connection request declined.', connectionStatus: 'declined' }
          : notif
      ));
    } catch (err) {
      alert('Failed to decline');
    }
  };

  const isHandled = (n) => {
    if (handled.has(n._id)) return true;
    if (n.connectionStatus && n.connectionStatus !== 'pending') return true;
    return false;
  };

  return (
    <div className="max-w-lg mx-auto pb-24 pt-2">
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
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
              className="glass-card p-4 rounded-2xl border border-border/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <Avatar src={n.senderId?.avatarUrl} name={n.senderId?.name || '?'} size="10" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.message || 'New notification'}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">
                    {safeDistanceToNow(n.createdAt)}
                  </p>

                  {n.type === 'connection_request' && (
                    isHandled(n) ? (
                      <p className="text-xs text-emerald-500 font-bold mt-2">
                        {n.connectionStatus === 'accepted' ? '✓ Connected' : '✗ Declined'}
                      </p>
                    ) : (
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
                    )
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
