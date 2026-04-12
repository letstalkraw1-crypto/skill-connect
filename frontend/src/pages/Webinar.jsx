import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Video, Copy, Check, Search, Lock, Loader2, X, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

// ─── Jitsi Room ──────────────────────────────────────────────────────────────
const JitsiRoom = ({ roomName, isHost, displayName, onLeave, title }) => {
  const jitsiUrl = `https://meet.jit.si/collabro-${roomName}#userInfo.displayName="${encodeURIComponent(displayName || 'Participant')}"`;

  useEffect(() => {
    // Open Jitsi in new tab
    const win = window.open(jitsiUrl, '_blank');
    if (!win) {
      alert('Popup blocked! Please allow popups for this site and try again.');
    }
  }, []);

  return (
    <div className="max-w-sm mx-auto pt-12 pb-24 px-4 text-center">
      <div className="glass-card p-8 rounded-3xl space-y-5">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Video size={28} className="text-primary" />
        </div>
        <div>
          <h2 className="font-black text-xl mb-1">{title}</h2>
          <p className="text-sm text-muted-foreground">Your webinar has opened in a new tab</p>
        </div>
        <div className="p-3 bg-accent/30 rounded-xl text-left">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Room Name</p>
          <p className="font-mono font-bold text-primary text-sm">{roomName}</p>
        </div>
        <a href={jitsiUrl} target="_blank" rel="noopener noreferrer"
          className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
          <Video size={18} /> Open Webinar Again
        </a>
        <button onClick={onLeave}
          className="w-full py-3 bg-accent text-foreground rounded-2xl font-bold hover:bg-accent/80 transition-all">
          Back to App
        </button>
      </div>
    </div>
  );
};

// ─── Invite Modal ─────────────────────────────────────────────────────────────
const InviteModal = ({ roomName, title, onClose, inline = false }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState(new Set());
  const [sending, setSending] = useState(null);

  const inviteLink = `${window.location.origin}/webinar?join=${roomName}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/profile/search', { params: { q: searchQuery, limit: 10 } });
        setSearchResults(data.users || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSendInvite = async (targetUser) => {
    setSending(targetUser._id);
    try {
      await api.post('/notifications/send', {
        targetUserId: targetUser._id,
        type: 'webinar_invite',
        message: `${user?.name} invited you to join a webinar: "${title}". Room: ${roomName}`,
        data: { roomName, inviteLink, webinarTitle: title },
      });
      setSent(prev => new Set([...prev, targetUser._id]));
    } catch {
      // Fallback: send via chat
      try {
        const { data: conv } = await api.post('/conversations', { participantIds: [targetUser._id] });
        await api.post(`/conversations/${conv._id || conv.id}/messages`, {
          text: `🎥 You're invited to join my webinar!\n\n*${title}*\n\nJoin link: ${inviteLink}`,
        });
        setSent(prev => new Set([...prev, targetUser._id]));
      } catch { alert('Failed to send invite'); }
    } finally { setSending(null); }
  };

  const content = (
    <div>
      {!inline && (
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg">Invite Participants</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>
      )}

      <div className="mb-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Shareable Invite Link</p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2.5 bg-accent/30 border border-border rounded-xl text-xs font-mono text-muted-foreground truncate">{inviteLink}</div>
          <button onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">Share this link — anyone can join for free</p>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Invite via App</p>
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search connections by name..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {searching && <p className="text-xs text-muted-foreground text-center py-4 animate-pulse">Searching...</p>}
          {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
          )}
          {!searching && searchQuery.length < 2 && (
            <p className="text-xs text-muted-foreground text-center py-4">Type a name to search</p>
          )}
          {searchResults.map(u => (
            <div key={u._id} className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl">
              <div className="h-9 w-9 rounded-xl bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                {u.name?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{u.name}</p>
                <p className="text-xs text-muted-foreground">@{u.shortId}</p>
              </div>
              <button onClick={() => handleSendInvite(u)} disabled={sent.has(u._id) || sending === u._id}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${sent.has(u._id) ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50'}`}>
                {sending === u._id ? '...' : sent.has(u._id) ? '✓ Sent' : 'Invite'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md glass-card rounded-3xl border border-border shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
        {content}
      </motion.div>
    </motion.div>
  );
};

// ─── Lobby ────────────────────────────────────────────────────────────────────
export default function Webinar() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [joinRoomName, setJoinRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeRoom, setActiveRoom] = useState(null);
  const [tab, setTab] = useState('create');
  const [createdRoom, setCreatedRoom] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [webinarInfo, setWebinarInfo] = useState(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    if (joinParam) { setJoinRoomName(joinParam); setTab('join'); }
  }, []);

  // Generate a clean room name from title
  const generateRoomName = (t) =>
    t.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30) +
    '-' + Math.random().toString(36).slice(2, 6);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true); setError('');
    try {
      const roomName = generateRoomName(title);
      const entryFee = price ? parseFloat(price) : 0;

      // Always register to get a code
      const { data } = await api.post('/webinars', { title, scheduledAt, description, price: entryFee, roomName });

      setCreatedRoom({ roomName, title, code: data.code });
      setShowInvite(true);
      setActiveRoom({ roomName, isHost: true, title, displayName: user?.name || 'Host' });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create webinar');
    } finally { setLoading(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const input = joinRoomName.trim().toUpperCase();
    if (!input) { setError('Code or room name is required'); return; }
    setLoading(true); setError('');
    try {
      let roomName = input;
      let info = null;

      // If it looks like a 5-char code, resolve it
      if (/^[A-Z0-9]{5}$/.test(input)) {
        try {
          const { data } = await api.get(`/webinars/by-code/${input}`);
          roomName = data.roomName;
          info = data;
        } catch {
          setError('Invalid webinar code. Check with the host.');
          setLoading(false);
          return;
        }
      } else {
        // Try as room name
        try {
          const { data } = await api.get(`/webinars/${input.toLowerCase()}`);
          info = data;
          roomName = input.toLowerCase();
        } catch {
          // No backend record = free webinar, just join
        }
      }

      if (info && info.price > 0 && !info.isHost && !info.hasPaid) {
        setWebinarInfo({ ...info, roomName });
        setLoading(false);
        return;
      }

      setActiveRoom({ roomName, isHost: info?.isHost || false, title: info?.title || roomName, displayName: user?.name || 'Participant' });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to join webinar.');
    } finally { setLoading(false); }
  };

  const handlePayAndJoin = async () => {
    if (!webinarInfo) return;
    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { alert('Failed to load payment gateway'); setPaying(false); return; }
      const { data } = await api.post(`/webinars/${webinarInfo.roomName}/payment/order`);
      const options = {
        key: data.keyId, amount: data.amount, currency: data.currency,
        name: 'Collabro', description: data.webinarTitle, order_id: data.orderId,
        prefill: { name: data.userName, email: data.userEmail },
        theme: { color: '#3b82f6' },
        handler: async (response) => {
          try {
            await api.post(`/webinars/${webinarInfo.roomName}/payment/verify`, response);
            setWebinarInfo(null);
            setActiveRoom({ roomName: webinarInfo.roomName, isHost: false, title: webinarInfo.title, displayName: user?.name || 'Participant' });
          } catch { alert('Payment succeeded but joining failed. Contact support.'); }
        },
        modal: { ondismiss: () => setPaying(false) }
      };
      new window.Razorpay(options).open();
    } catch (err) {
      alert(err?.response?.data?.error || 'Payment failed');
      setPaying(false);
    }
  };

  // Paywall
  if (webinarInfo) {
    return (
      <div className="max-w-sm mx-auto pt-12 pb-24 px-4">
        <div className="glass-card p-8 rounded-3xl text-center space-y-4">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Lock size={28} className="text-primary" />
          </div>
          <h2 className="font-black text-xl">{webinarInfo.title}</h2>
          <p className="text-muted-foreground text-sm">This is a paid webinar</p>
          <div className="py-4 border-y border-border">
            <p className="text-3xl font-black text-primary">₹{webinarInfo.price}</p>
            <p className="text-xs text-muted-foreground mt-1">one-time entry fee</p>
          </div>
          <button onClick={handlePayAndJoin} disabled={paying}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {paying ? <Loader2 size={18} className="animate-spin" /> : null}
            {paying ? 'Processing...' : `Pay ₹${webinarInfo.price} & Join`}
          </button>
          <button onClick={() => setWebinarInfo(null)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
        </div>
      </div>
    );
  }

  // Invite screen (after creating)
  if (showInvite && createdRoom && activeRoom) {
    return (
      <div className="max-w-lg mx-auto pb-24 pt-4 px-4">
        <div className="glass-card p-6 rounded-2xl mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
              <Check size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="font-black text-lg">Webinar Created!</h2>
              <p className="text-xs text-muted-foreground">Invite participants before starting</p>
            </div>
          </div>
          <div className="p-3 bg-accent/30 rounded-xl mb-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Room Name</p>
            <p className="font-mono font-bold text-primary">{createdRoom.roomName}</p>
          </div>
          {createdRoom.code && (
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mb-4 text-center">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Webinar Code</p>
              <p className="text-4xl font-black text-primary tracking-[0.3em]">{createdRoom.code}</p>
              <p className="text-xs text-muted-foreground mt-2">Share this code — participants enter it to join</p>
            </div>
          )}
          <InviteModal roomName={createdRoom.roomName} title={createdRoom.title} onClose={() => {}} inline />
        </div>
        <button onClick={() => setShowInvite(false)}
          className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
          <Video size={18} /> Start Webinar Now
        </button>
      </div>
    );
  }

  // Active room
  if (activeRoom) {
    return (
      <JitsiRoom
        roomName={activeRoom.roomName}
        isHost={activeRoom.isHost}
        displayName={activeRoom.displayName}
        title={activeRoom.title}
        onLeave={() => setActiveRoom(null)}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24 pt-4 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Video size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Webinar</h1>
          <p className="text-xs text-muted-foreground">Host or join a live video session · Powered by Jitsi Meet</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-accent/30 rounded-2xl mb-6">
        <button onClick={() => setTab('create')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'create' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>
          Host a Webinar
        </button>
        <button onClick={() => setTab('join')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'join' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}>
          Join a Webinar
        </button>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">{error}</div>}

      {tab === 'create' && (
        <form onSubmit={handleCreate} className="glass-card p-6 rounded-2xl space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Webinar Title *</label>
            <input type="text" placeholder="e.g. Public Speaking Masterclass"
              value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Description</label>
            <textarea rows={2} placeholder="What will you cover?"
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Schedule (optional)</label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Entry Fee (₹) — 0 = free</label>
              <input type="number" min={0} placeholder="0"
                value={price} onChange={e => setPrice(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
            </div>
          </div>
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-primary">As host you get:</p>
            <p>• Video, mic, screen share controls</p>
            <p>• Mute/remove any participant</p>
            <p>• Built-in chat & reactions</p>
            <p>• Completely free, no limits</p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
            {loading ? 'Creating...' : 'Start Webinar Now'}
          </button>
        </form>
      )}

      {tab === 'join' && (
        <form onSubmit={handleJoin} className="glass-card p-6 rounded-2xl space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Webinar Code or Room Name *</label>
            <input type="text" placeholder="Enter 5-digit code (e.g. AB3X9) or room name"
              value={joinRoomName} onChange={e => setJoinRoomName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
            <p className="text-xs text-muted-foreground mt-1">Ask the host for the 5-digit code or invite link</p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
            {loading ? 'Joining...' : 'Join Webinar'}
          </button>
        </form>
      )}
    </div>
  );
}
