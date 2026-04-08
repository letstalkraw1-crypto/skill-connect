import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Clock, Users, Hash, ChevronRight, X, User, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Avatar from '../components/Avatar';
import { safeFormat } from '../utils/utils';
import { format } from 'date-fns';

const formatEventDate = (dt) => {
  try { return format(new Date(dt), 'EEE, MMM d yyyy • h:mm a'); } catch { return dt; }
};

const RsvpModal = ({ event, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isPaid = event.entryFee > 0;

  const loadRazorpay = () => new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) { setError('Name and mobile number are required'); return; }
    if (!/^\d{10}$/.test(phone.replace(/\s/g, ''))) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true);
    setError('');

    try {
      if (isPaid) {
        // Load Razorpay script
        const loaded = await loadRazorpay();
        if (!loaded) { setError('Failed to load payment gateway. Check your internet.'); setLoading(false); return; }

        // Create order
        const { data } = await api.post(`/events/${event._id}/payment/order`, { rsvpName: name.trim(), rsvpPhone: phone.trim() });

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: data.currency,
          name: 'Collabro',
          description: `Entry fee for ${data.eventTitle}`,
          order_id: data.orderId,
          prefill: { name: data.userName, contact: phone.trim() },
          theme: { color: '#3b82f6' },
          handler: async (response) => {
            try {
              await api.post(`/events/${event._id}/payment/verify`, {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                rsvpName: name.trim(),
                rsvpPhone: phone.trim(),
              });
              onSuccess('accepted');
            } catch (err) {
              setError('Payment succeeded but registration failed. Contact support.');
            }
          },
          modal: { ondismiss: () => setLoading(false) }
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        await api.post(`/events/${event._id}/rsvp`, { rsvpName: name.trim(), rsvpPhone: phone.trim() });
        onSuccess('pending');
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to join event');
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-sm glass-card rounded-3xl p-6 border border-border shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">Join Event</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-5 font-medium">{event.title}
          {isPaid && <span className="ml-2 px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs font-bold">₹{event.entryFee} entry fee</span>}
        </p>
        {error && <div className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Your Name *</label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
              <input type="text" placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Mobile Number *</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-muted-foreground" />
              <input type="tel" placeholder="10-digit mobile number" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
            {loading ? 'Processing...' : isPaid ? `Pay ₹${event.entryFee} & Join` : 'Confirm Join'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const AttendeeModal = ({ event, onClose }) => {
  const [attendees, setAttendees] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/events/${event._id}`).then(({ data }) => {
      setAttendees(data.attendees || []);
      setPending(data.pendingRequests || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [event._id]);

  const handleManage = async (rsvpUserId, status) => {
    try {
      await api.put(`/events/${event._id}/rsvp/${rsvpUserId}`, { status });
      setPending(prev => prev.filter(p => p.userId?.toString() !== rsvpUserId?.toString()));
      if (status === 'accepted') {
        const user = pending.find(p => p.userId?.toString() === rsvpUserId?.toString());
        if (user) setAttendees(prev => [...prev, user]);
      }
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md glass-card rounded-3xl p-6 border border-border shadow-2xl max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg">Attendees — {event.title}</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>
        {loading ? <div className="py-8 text-center text-muted-foreground animate-pulse">Loading...</div> : (
          <>
            {pending.length > 0 && (
              <div className="mb-5">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-3">Pending Requests ({pending.length})</p>
                <div className="space-y-2">
                  {pending.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <Avatar src={p.avatarUrl} name={p.name} size="10" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{p.name}</p>
                        {p.rsvpPhone && <p className="text-xs text-muted-foreground">{p.rsvpPhone}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleManage(p.userId, 'accepted')}
                          className="px-3 py-1 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:scale-105 transition-all">Accept</button>
                        <button onClick={() => handleManage(p.userId, 'rejected')}
                          className="px-3 py-1 bg-accent text-foreground rounded-lg text-xs font-bold hover:bg-destructive hover:text-destructive-foreground transition-all">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Confirmed ({attendees.length})</p>
            {attendees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No confirmed attendees yet</p>
            ) : (
              <div className="space-y-2">
                {attendees.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl">
                    <Avatar src={a.avatarUrl} name={a.name} size="10" />
                    <p className="text-sm font-bold">{a.name}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default function Events() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [attendeeEvent, setAttendeeEvent] = useState(null);

  const fetchEvents = async () => {
    try {
      const { data } = await api.get('/events');
      setEvents(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCancelRsvp = async (eventId) => {
    try {
      await api.post(`/events/${eventId}/rsvp`, {});
      setEvents(prev => prev.map(e => e._id === eventId ? { ...e, myRsvpStatus: null } : e));
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
  };

  const myId = user?._id || user?.id;

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Calendar size={24} className="text-primary" />
        <h1 className="text-2xl font-black tracking-tight">Events</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="glass-card p-5 rounded-2xl animate-pulse h-48" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Calendar size={48} className="opacity-20" />
          <p className="font-bold">No events yet</p>
          <p className="text-sm">Use the + button to create one</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event, idx) => {
            const isOrganiser = event.creatorId?.toString() === myId || event.creator_id?.toString() === myId || event.isCreator;
            const rsvpStatus = event.myRsvpStatus || event.my_rsvp_status;
            return (
              <motion.div key={event._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="glass-card rounded-2xl border border-border overflow-hidden">
                {/* Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-black cursor-pointer hover:text-primary transition-colors"
                          onClick={() => navigate(`/events/${event._id}`)}>{event.title}</h3>
                        {isOrganiser && (
                          <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">Organiser</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Hash size={12} className="text-primary" />
                        <span className="font-black text-primary tracking-widest">{event.shortCode || '—'}</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      rsvpStatus === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                      rsvpStatus === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-accent text-muted-foreground'
                    }`}>
                      {rsvpStatus === 'accepted' ? 'Confirmed' : rsvpStatus === 'pending' ? 'Pending' : 'Open'}
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
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
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={14} className="text-primary flex-shrink-0" />
                      <span>{event.attendeeCount || event.attendee_count || 0} attending</span>
                      {event.entryFee > 0 && (
                        <span className="ml-auto px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">₹{event.entryFee}</span>
                      )}
                      {(!event.entryFee || event.entryFee === 0) && (
                        <span className="ml-auto px-2 py-0.5 bg-accent text-muted-foreground text-xs font-bold rounded-full">Free</span>
                      )}
                    </div>
                  </div>

                  {/* Organiser */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                    <Avatar src={event.creatorAvatar || event.creator_avatar} name={event.creatorName || event.creator_name} size="8" />
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Organised by</p>
                      <p className="text-xs font-bold">{event.creatorName || event.creator_name}</p>
                    </div>
                  </div>

                  {/* Guidelines */}
                  {event.guidelines && (
                    <div className="mt-3 p-3 bg-accent/30 rounded-xl border-l-4 border-primary/40">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Guidelines</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{event.guidelines}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 pb-4 flex gap-2">
                  {isOrganiser ? (
                    <button onClick={() => setAttendeeEvent(event)}
                      className="flex-1 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2">
                      <Users size={16} /> Manage Attendees
                    </button>
                  ) : rsvpStatus ? (
                    <button onClick={() => handleCancelRsvp(event._id)}
                      className="flex-1 py-2.5 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-bold hover:bg-destructive hover:text-destructive-foreground transition-all">
                      Cancel RSVP
                    </button>
                  ) : (
                    <button onClick={() => setRsvpEvent(event)}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                      Join Event
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {rsvpEvent && (
          <RsvpModal event={rsvpEvent} onClose={() => setRsvpEvent(null)}
            onSuccess={(status) => {
              setEvents(prev => prev.map(e => e._id === rsvpEvent._id ? { ...e, myRsvpStatus: status || 'pending' } : e));
              setRsvpEvent(null);
            }} />        )}
        {attendeeEvent && <AttendeeModal event={attendeeEvent} onClose={() => setAttendeeEvent(null)} />}
      </AnimatePresence>
    </div>
  );
}
