import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, MessageSquare, FileText, Hand, LogOut, Users, Smile, X, Send, Copy, Check, Search, Lock, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const REACTIONS = ['👍', '👏', '❤️', '😂', '😮', '🔥'];

const loadRazorpay = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.onload = () => resolve(true);
  script.onerror = () => resolve(false);
  document.body.appendChild(script);
});

const WebinarRoom = ({ roomUrl, token, isHost, onLeave, title }) => {
  const iframeRef = useRef(null);
  const callRef = useRef(null);
  const [isMuted, setIsMuted] = useState(!isHost);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [notes, setNotes] = useState('');
  const [reaction, setReaction] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let frame;
    const initCall = async () => {
      try {
        const DailyIframe = (await import('@daily-co/daily-js')).default;
        frame = DailyIframe.createFrame(iframeRef.current, {
          showLeaveButton: false,
          showFullscreenButton: true,
          iframeStyle: { width: '100%', height: '100%', border: 'none', borderRadius: '16px' },
        });
        callRef.current = frame;

        frame.on('joined-meeting', () => setLoading(false));
        frame.on('participant-joined', updateParticipants);
        frame.on('participant-left', updateParticipants);
        frame.on('participant-updated', updateParticipants);
        frame.on('app-message', (e) => {
          if (e.data?.type === 'chat') {
            setMessages(prev => [...prev, e.data]);
          }
          if (e.data?.type === 'reaction') {
            setReaction(e.data.emoji);
            setTimeout(() => setReaction(null), 2000);
          }
        });

        await frame.join({ url: roomUrl, token });

        function updateParticipants() {
          const p = frame.participants();
          setParticipants(Object.values(p));
        }
      } catch (err) {
        console.error('Failed to init Daily call:', err);
        setLoading(false);
      }
    };

    initCall();
    return () => { if (callRef.current) callRef.current.destroy(); };
  }, [roomUrl, token]);

  const toggleMic = () => {
    if (!callRef.current) return;
    if (isMuted) { callRef.current.setLocalAudio(true); setIsMuted(false); }
    else { callRef.current.setLocalAudio(false); setIsMuted(true); }
  };

  const toggleVideo = () => {
    if (!callRef.current) return;
    if (isVideoOff) { callRef.current.setLocalVideo(true); setIsVideoOff(false); }
    else { callRef.current.setLocalVideo(false); setIsVideoOff(true); }
  };

  const toggleScreenShare = async () => {
    if (!callRef.current) return;
    try {
      if (isScreenSharing) {
        await callRef.current.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await callRef.current.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      alert('Screen sharing failed: ' + err.message);
    }
  };

  const muteParticipant = (sessionId) => {
    if (!callRef.current || !isHost) return;
    callRef.current.updateParticipant(sessionId, { setAudio: false });
  };

  const sendChatMessage = () => {
    if (!chatInput.trim() || !callRef.current) return;
    const msg = { type: 'chat', text: chatInput.trim(), sender: user?.name || 'You', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    callRef.current.sendAppMessage(msg, '*');
    setMessages(prev => [...prev, { ...msg, isMe: true }]);
    setChatInput('');
  };

  const sendReaction = (emoji) => {
    if (!callRef.current) return;
    callRef.current.sendAppMessage({ type: 'reaction', emoji }, '*');
    setReaction(emoji);
    setTimeout(() => setReaction(null), 2000);
    setShowReactions(false);
  };

  const handleLeave = async () => {
    if (callRef.current) await callRef.current.leave();
    onLeave();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10">
        <h2 className="text-white font-bold text-sm truncate">{title}</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">{participants.length} participants</span>
          {isHost && <span className="px-2 py-0.5 bg-primary/30 text-primary text-[10px] font-bold rounded-full">HOST</span>}
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video */}
        <div className="flex-1 relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="text-center text-white">
                <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                <p className="font-bold animate-pulse">Joining webinar...</p>
              </div>
            </div>
          )}
          <div ref={iframeRef} className="w-full h-full" />

          {/* Floating reaction */}
          <AnimatePresence>
            {reaction && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.5 }} animate={{ opacity: 1, y: -20, scale: 1.5 }} exit={{ opacity: 0, scale: 0 }}
                className="absolute bottom-24 left-1/2 -translate-x-1/2 text-4xl pointer-events-none z-20">
                {reaction}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Side panels */}
        <AnimatePresence>
          {(showChat || showNotes || showParticipants) && (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              className="bg-zinc-900 border-l border-white/10 flex flex-col overflow-hidden">
              {/* Panel tabs */}
              <div className="flex border-b border-white/10">
                {[
                  { key: 'chat', label: 'Chat', show: showChat, set: () => { setShowChat(true); setShowNotes(false); setShowParticipants(false); } },
                  { key: 'notes', label: 'Notes', show: showNotes, set: () => { setShowNotes(true); setShowChat(false); setShowParticipants(false); } },
                  { key: 'people', label: 'People', show: showParticipants, set: () => { setShowParticipants(true); setShowChat(false); setShowNotes(false); } },
                ].map(tab => (
                  <button key={tab.key} onClick={tab.set}
                    className={`flex-1 py-3 text-xs font-bold transition-colors ${tab.show ? 'text-primary border-b-2 border-primary' : 'text-white/50 hover:text-white'}`}>
                    {tab.label}
                  </button>
                ))}
                <button onClick={() => { setShowChat(false); setShowNotes(false); setShowParticipants(false); }}
                  className="px-3 text-white/50 hover:text-white">
                  <X size={16} />
                </button>
              </div>

              {/* Chat */}
              {showChat && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {messages.length === 0 && (
                      <p className="text-white/30 text-xs text-center py-8">No messages yet</p>
                    )}
                    {messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
                        <p className="text-[10px] text-white/40 mb-1">{msg.sender} · {msg.time}</p>
                        <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${msg.isMe ? 'bg-primary text-white' : 'bg-white/10 text-white'}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-white/10 flex gap-2">
                    <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                      placeholder="Type a message..."
                      className="flex-1 bg-white/10 text-white placeholder:text-white/30 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50" />
                    <button onClick={sendChatMessage} className="h-9 w-9 bg-primary rounded-xl flex items-center justify-center hover:bg-primary/80 transition-colors">
                      <Send size={16} className="text-white" />
                    </button>
                  </div>
                </div>
              )}

              {/* Notes */}
              {showNotes && (
                <div className="flex-1 p-3">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-2">Private Notes (only you can see)</p>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Take notes here..."
                    className="w-full h-full bg-white/5 text-white placeholder:text-white/20 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[300px]" />
                </div>
              )}

              {/* Participants */}
              {showParticipants && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {participants.map((p, i) => (
                    <div key={p.session_id || i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5">
                      <div className="h-8 w-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-primary">
                        {(p.user_name || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-bold truncate">{p.user_name || 'Participant'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {!p.audio && <span className="text-[10px] text-red-400">🔇 Muted</span>}
                          {!p.video && <span className="text-[10px] text-white/40">📷 Off</span>}
                          {p.local && <span className="text-[10px] text-primary">You</span>}
                        </div>
                      </div>
                      {isHost && !p.local && (
                        <button onClick={() => muteParticipant(p.session_id)}
                          className="text-[10px] px-2 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors font-bold">
                          Mute
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 bg-black/90 border-t border-white/10">
        {/* Mic */}
        <button onClick={toggleMic}
          className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          <span className="text-[9px] font-bold">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Video */}
        <button onClick={toggleVideo}
          className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${isVideoOff ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white hover:bg-white/20'}`}>
          {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
          <span className="text-[9px] font-bold">{isVideoOff ? 'Start Video' : 'Stop Video'}</span>
        </button>

        {/* Screen Share — host only */}
        {isHost && (
          <button onClick={toggleScreenShare}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${isScreenSharing ? 'bg-primary/30 text-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
            <span className="text-[9px] font-bold">{isScreenSharing ? 'Stop Share' : 'Share Screen'}</span>
          </button>
        )}

        {/* Reactions */}
        <div className="relative">
          <button onClick={() => setShowReactions(s => !s)}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-all">
            <Smile size={20} />
            <span className="text-[9px] font-bold">React</span>
          </button>
          <AnimatePresence>
            {showReactions && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex gap-2 bg-zinc-800 border border-white/10 rounded-2xl p-2 shadow-2xl">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => sendReaction(emoji)}
                    className="text-2xl hover:scale-125 transition-transform">{emoji}</button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat */}
        <button onClick={() => { setShowChat(s => !s); setShowNotes(false); setShowParticipants(false); }}
          className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${showChat ? 'bg-primary/30 text-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}>
          <MessageSquare size={20} />
          <span className="text-[9px] font-bold">Chat</span>
        </button>

        {/* Notes */}
        <button onClick={() => { setShowNotes(s => !s); setShowChat(false); setShowParticipants(false); }}
          className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${showNotes ? 'bg-primary/30 text-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}>
          <FileText size={20} />
          <span className="text-[9px] font-bold">Notes</span>
        </button>

        {/* Participants */}
        <button onClick={() => { setShowParticipants(s => !s); setShowChat(false); setShowNotes(false); }}
          className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${showParticipants ? 'bg-primary/30 text-primary' : 'bg-white/10 text-white hover:bg-white/20'}`}>
          <Users size={20} />
          <span className="text-[9px] font-bold">People</span>
        </button>

        {/* Leave */}
        <button onClick={handleLeave}
          className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-red-500 text-white hover:bg-red-600 transition-all ml-4">
          <LogOut size={20} />
          <span className="text-[9px] font-bold">Leave</span>
        </button>
      </div>
    </div>
  );
};

// ─── Invite Modal ────────────────────────────────────────────────────────────
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
      // Send notification via the notifications API
      await api.post('/notifications/send', {
        targetUserId: targetUser._id,
        type: 'webinar_invite',
        message: `${user?.name} invited you to join a webinar: "${title}". Room: ${roomName}`,
        data: { roomName, inviteLink, webinarTitle: title },
      });
      setSent(prev => new Set([...prev, targetUser._id]));
    } catch (err) {
      // Fallback: send via chat if notification endpoint doesn't exist
      try {
        const { data: conv } = await api.post('/conversations', { participantIds: [targetUser._id] });
        await api.post(`/conversations/${conv._id || conv.id}/messages`, {
          text: `🎥 You're invited to join my webinar!\n\n*${title}*\n\nJoin link: ${inviteLink}\nRoom name: ${roomName}`,
        });
        setSent(prev => new Set([...prev, targetUser._id]));
      } catch (e) {
        alert('Failed to send invite');
      }
    } finally { setSending(null); }
  };

  const content = (
    <div className={inline ? '' : 'w-full max-w-md glass-card rounded-3xl border border-border shadow-2xl p-6 max-h-[85vh] flex flex-col'}>
      {!inline && (
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg">Invite Participants</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>
      )}

        {/* Copy link */}
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Shareable Invite Link</p>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2.5 bg-accent/30 border border-border rounded-xl text-xs font-mono text-muted-foreground truncate">
              {inviteLink}
            </div>
            <button onClick={handleCopy}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Anyone with this link can join as a participant</p>
        </div>

        <div className={`border-t border-border pt-4 ${inline ? '' : 'flex-1 flex flex-col overflow-hidden'}`}>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Invite via App</p>
          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search connections by name..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
          </div>

          <div className={`${inline ? '' : 'flex-1 overflow-y-auto'} space-y-2`}>
            {searching && <p className="text-xs text-muted-foreground text-center py-4 animate-pulse">Searching...</p>}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No users found</p>
            )}
            {!searching && searchQuery.length < 2 && (
              <p className="text-xs text-muted-foreground text-center py-4">Type a name to search your connections</p>
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
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}>
        {content}
      </motion.div>
    </motion.div>
  );
};

// ─── Webinar Lobby (create / join) ───────────────────────────────────────────
export default function Webinar() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [webinarInfo, setWebinarInfo] = useState(null); // for paid join paywall
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinParam = params.get('join');
    if (joinParam) {
      setJoinRoomName(joinParam);
      setTab('join');
    }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setLoading(true); setError('');
    try {
      const { data } = await api.post('/webinars', { title, scheduledAt, description, price: price || 0 });
      const { data: tokenData } = await api.post(`/webinars/${data.roomName}/token`, { isHost: true });
      setCreatedRoom({ roomName: data.roomName, title: data.title });
      setShowInvite(true);
      setActiveRoom({ roomUrl: data.roomUrl, token: tokenData.token, isHost: true, title: data.title, roomName: data.roomName });
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create webinar');
    } finally { setLoading(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinRoomName.trim()) { setError('Room name is required'); return; }
    setLoading(true); setError('');
    try {
      // First check webinar info (price etc.)
      const { data: info } = await api.get(`/webinars/${joinRoomName.trim()}`);

      if (info.price > 0 && !info.isHost && !info.hasPaid) {
        // Show paywall
        setWebinarInfo({ ...info, roomName: joinRoomName.trim() });
        setLoading(false);
        return;
      }

      // Free or already paid — get token directly
      const { data: tokenData } = await api.post(`/webinars/${joinRoomName.trim()}/token`, { isHost: info.isHost });
      const roomUrl = `https://collabro.daily.co/${joinRoomName.trim()}`;
      setActiveRoom({ roomUrl, token: tokenData.token, isHost: info.isHost, title: info.title || joinRoomName.trim(), roomName: joinRoomName.trim() });
    } catch (err) {
      if (err?.response?.status === 404) {
        setError('Webinar not found. Check the room name.');
      } else {
        setError(err?.response?.data?.error || 'Failed to join webinar.');
      }
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
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: 'Collabro',
        description: data.webinarTitle,
        order_id: data.orderId,
        prefill: { name: data.userName, email: data.userEmail },
        theme: { color: '#3b82f6' },
        handler: async (response) => {
          try {
            await api.post(`/webinars/${webinarInfo.roomName}/payment/verify`, response);
            // Now get token
            const { data: tokenData } = await api.post(`/webinars/${webinarInfo.roomName}/token`, { isHost: false });
            const roomUrl = `https://collabro.daily.co/${webinarInfo.roomName}`;
            setWebinarInfo(null);
            setActiveRoom({ roomUrl, token: tokenData.token, isHost: false, title: webinarInfo.title, roomName: webinarInfo.roomName });
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

  // Paywall screen
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

  // Show invite modal before entering room (host only)
  if (showInvite && createdRoom && activeRoom) {
    return (
      <div className="max-w-lg mx-auto pb-24 pt-4">
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

          <InviteModal
            roomName={createdRoom.roomName}
            title={createdRoom.title}
            onClose={() => {}}
            inline
          />
        </div>

        <button onClick={() => setShowInvite(false)}
          className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
          <Video size={18} /> Start Webinar Now
        </button>
      </div>
    );
  }

  if (activeRoom) {
    return (
      <WebinarRoom
        roomUrl={activeRoom.roomUrl}
        token={activeRoom.token}
        isHost={activeRoom.isHost}
        title={activeRoom.title}
        onLeave={() => setActiveRoom(null)}
      />
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-24 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Video size={20} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Webinar</h1>
          <p className="text-xs text-muted-foreground">Host or join a live video session</p>
        </div>
      </div>

      {/* Tabs */}
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

      {error && (
        <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">{error}</div>
      )}

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
            <textarea rows={3} placeholder="What will you cover in this session?"
              value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm resize-none" />
          </div>
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
            <p className="text-xs text-muted-foreground mt-1">Participants will pay this amount via Razorpay before joining</p>
          </div>

          <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-muted-foreground space-y-1">
            <p className="font-bold text-primary">As host you can:</p>
            <p>• Mute/unmute any participant</p>
            <p>• Share your screen or specific application</p>
            <p>• Present slides and media</p>
            <p>• Send reactions and chat messages</p>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Video size={18} />}
            {loading ? 'Creating...' : 'Start Webinar Now'}
          </button>
        </form>
      )}

      {tab === 'join' && (
        <form onSubmit={handleJoin} className="glass-card p-6 rounded-2xl space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Room Name *</label>
            <input type="text" placeholder="Enter the room name shared by the host"
              value={joinRoomName} onChange={e => setJoinRoomName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
            <p className="text-xs text-muted-foreground mt-1">The host will share the room name with participants</p>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Hand size={18} />}
            {loading ? 'Joining...' : 'Join Webinar'}
          </button>
        </form>
      )}
    </div>
  );
}
