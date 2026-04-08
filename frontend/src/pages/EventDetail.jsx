import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Clock, Users, Hash, ArrowLeft, Check, X, User, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Avatar from '../components/Avatar';
import { format } from 'date-fns';

const formatEventDate = (dt) => {
  try { return format(new Date(dt), 'EEE, MMM d yyyy • h:mm a'); } catch { return dt; }
};

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const myId = user?._id || user?.id;

  const fetchEvent = async () => {
    try {
      const { data } = await api.get(`/events/${id}`);
      setEvent(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvent(); }, [id]);

  const isOrganiser = event?.isCreator || event?.creator_id?.toString() === myId;

  const handleManage = async (targetUserId, status) => {
    setActionLoading(targetUserId + status);
    try {
      await api.put(`/events/${id}/rsvp/${targetUserId}`, { status });
      setEvent(prev => ({
        ...prev,
        pendingRequests: prev.pendingRequests?.filter(p => p.userId?.toString() !== targetUserId?.toString()),
        attendees: status === 'accepted'
          ? [...(prev.attendees || []), prev.pendingRequests?.find(p => p.userId?.toString() === targetUserId?.toString())]
          : prev.attendees
      }));
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
    finally { setActionLoading(null); }
  };

  if (loading) return (
    <div className="max-w-lg mx-auto pb-24 space-y-4">
      {[1,2,3].map(i => <div key={i} className="glass-card p-4 rounded-2xl animate-pulse h-20" />)}
    </div>
  );

  if (!event) return <div className="text-center py-20 text-muted-foreground">Event not found</div>;

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight">{event.title}</h1>
          {isOrganiser && <p className="text-xs text-primary font-bold">You are the organiser</p>}
        </div>
      </div>

      {/* Event Info */}
      <div className="glass-card rounded-2xl border border-border p-5 mb-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs text-primary font-black tracking-widest">
          <Hash size={12} /> {event.shortCode}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Clock size={14} className="text-primary flex-shrink-0" />
          <span>{formatEventDate(event.datetime)}</span>
        </div>
        {(event.venueName || event.venue_name) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-primary flex-shrink-0" />
            <span>{event.venueName || event.venue_name}</span>
          </div>
        )}
        {event.guidelines && (
          <div className="p-3 bg-accent/30 rounded-xl border-l-4 border-primary/40">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Guidelines</p>
            <p className="text-xs text-muted-foreground">{event.guidelines}</p>
          </div>
        )}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Avatar src={event.creatorAvatar || event.creator_avatar} name={event.creatorName || event.creator_name} size="8" />
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Organised by</p>
            <p className="text-xs font-bold">{event.creatorName || event.creator_name}</p>
          </div>
          {event.entryFee > 0 && (
            <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">₹{event.entryFee}</span>
          )}
        </div>
      </div>

      {/* Pending Requests — organiser only */}
      {isOrganiser && event.pendingRequests?.length > 0 && (
        <div className="glass-card rounded-2xl border border-amber-500/30 overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-border bg-amber-500/10">
            <p className="text-xs font-bold uppercase tracking-widest text-amber-400">Pending Requests ({event.pendingRequests.length})</p>
          </div>
          <div className="divide-y divide-border/50">
            {event.pendingRequests.map((p, i) => (
              <div key={p.userId || i} className="flex items-center gap-3 px-5 py-3">
                <Avatar src={p.avatarUrl} name={p.name} size="10" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{p.name}</p>
                  {p.rsvpPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone size={10} /> {p.rsvpPhone}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleManage(p.userId, 'accepted')} disabled={!!actionLoading}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:scale-105 transition-all disabled:opacity-50">
                    Accept
                  </button>
                  <button onClick={() => handleManage(p.userId, 'rejected')} disabled={!!actionLoading}
                    className="px-3 py-1.5 bg-accent text-foreground rounded-lg text-xs font-bold hover:bg-destructive hover:text-destructive-foreground transition-all disabled:opacity-50">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Attendees */}
      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">
            Confirmed Attendees ({event.attendees?.length || 0})
          </p>
        </div>
        {!event.attendees?.length ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No confirmed attendees yet</div>
        ) : (
          <div className="divide-y divide-border/50">
            {event.attendees.map((a, i) => (
              <motion.div key={a.id || a._id || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
                <Avatar src={a.avatarUrl} name={a.name} size="10" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground">@{a.shortId || (a.id || a._id)?.slice(0, 8)}</p>
                </div>
                <button onClick={() => navigate(`/profile/${a.id || a._id}`)}
                  className="text-[10px] font-bold text-primary hover:underline">View</button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
