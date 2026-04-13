import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import { Send, Plus, MoreVertical, Video, Search, ChevronLeft, MessageCircle, X, Forward, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl, safeFormat } from '../utils/utils';
import Avatar from '../components/Avatar';
import ChatSkeleton from '../components/ChatSkeleton';
import api from '../services/api';

const MediaRenderer = ({ url }) => {
  if (!url) return null;
  const resolvedUrl = getAssetUrl(url);
  const low = url.toLowerCase();
  if (['.jpg','.png','.webp','.jpeg','.gif'].some(ext => low.includes(ext)))
    return <img src={resolvedUrl} alt="media" className="max-w-full rounded-xl cursor-pointer" onClick={() => window.open(resolvedUrl,'_blank')} />;
  if (['.mp3','.webm','.ogg','.wav'].some(ext => low.includes(ext)))
    return <audio controls src={resolvedUrl} className="max-w-full h-8" />;
  return <span>{url}</span>;
};

const MessageBubble = ({ msg, isMe, onDelete, onForward }) => {
  const [showActions, setShowActions] = useState(false);
  const timerRef = useRef(null);
  const isMedia = msg.text && ['.jpg','.png','.webp','.jpeg','.gif','.mp3','.webm','.ogg','.wav'].some(ext => msg.text.toLowerCase().includes(ext));
  const startPress = () => { timerRef.current = setTimeout(() => setShowActions(true), 500); };
  const endPress = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  return (
    <motion.div initial={{ opacity:0, y:10, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative`}>
      <div className="max-w-[78%] space-y-0.5">
        <div className={`px-4 py-2.5 rounded-2xl shadow cursor-pointer select-none ${isMe ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-accent/60 rounded-tl-sm border border-border/50'} ${showActions ? 'ring-2 ring-primary/50' : ''}`}
          onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}
          onTouchStart={startPress} onTouchEnd={endPress}
          onContextMenu={e => { e.preventDefault(); setShowActions(true); }}>
          {isMedia ? <MediaRenderer url={msg.text} /> : <p className="text-sm">{msg.text}</p>}
        </div>
        <p className={`text-[10px] text-muted-foreground px-1 ${isMe ? 'text-right' : 'text-left'}`}>{safeFormat(msg.sentAt)}</p>
        <AnimatePresence>
          {showActions && (
            <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.8 }}
              className={`absolute bottom-8 ${isMe ? 'right-0' : 'left-0'} z-20 flex gap-1 bg-background border border-border rounded-2xl shadow-2xl p-1`}>
              <button onClick={() => { onForward(); setShowActions(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-accent text-xs font-bold"><Forward size={14} /> Forward</button>
              {isMe && <button onClick={() => { onDelete(); setShowActions(false); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-destructive/10 text-destructive text-xs font-bold"><Trash2 size={14} /> Delete</button>}
              <button onClick={() => setShowActions(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-accent text-xs font-bold"><X size={14} /></button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {showActions && <div className="fixed inset-0 z-10" onClick={() => setShowActions(false)} />}
    </motion.div>
  );
};

const ForwardModal = ({ conversations, onClose, onForward }) => {
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const filtered = conversations.filter(c => !c.isGroup && c.otherUser?.name?.toLowerCase().includes(search.toLowerCase()));
  const toggle = id => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-background rounded-t-3xl border-t border-border shadow-2xl flex flex-col" style={{ maxHeight:'70vh' }}>
        <div className="flex justify-center pt-3 pb-1"><div className="h-1 w-10 rounded-full bg-border" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <h3 className="font-black">Forward to...</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl bg-accent"><X size={16} /></button>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <input type="text" placeholder="Search people..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-accent/30 border border-border outline-none text-sm" />
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-2 space-y-1">
          {filtered.map(conv => (
            <button key={conv.id} onClick={() => toggle(conv.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${selected.has(conv.id) ? 'bg-primary/20 border border-primary/30' : 'hover:bg-accent/50'}`}>
              <Avatar src={conv.otherUser?.avatarUrl} name={conv.otherUser?.name} size="10" />
              <span className="font-bold text-sm flex-1 text-left">{conv.otherUser?.name}</span>
              {selected.has(conv.id) && <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center"><X size={10} className="text-white rotate-45" /></div>}
            </button>
          ))}
        </div>
        <div className="px-4 py-4 border-t border-border">
          <button onClick={() => { onForward([...selected]); onClose(); }} disabled={selected.size === 0} className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold disabled:opacity-40 flex items-center justify-center gap-2">
            <Forward size={18} /> {selected.size > 0 ? `Forward to ${selected.size} person${selected.size > 1 ? 's' : ''}` : 'Forward...'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Chat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { socket, isConnected, on } = useSocketContext() || {};
  const [conversations, setConversations] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('chats');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [newChatResults, setNewChatResults] = useState([]);
  const [newChatSearching, setNewChatSearching] = useState(false);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [showForward, setShowForward] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showChatMenu, setShowChatMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior:'smooth' });

  const fetchConversations = async () => {
    try {
      const { data } = await chatService.listConversations();
      const convList = Array.isArray(data) ? data : [];
      setConversations(convList);
      if (id) {
        const existing = convList.find(c => c.id === id || c.otherUser?.id === id || c.otherUser?._id === id);
        if (existing) { setActiveChat(existing); }
        else {
          try {
            const res = await chatService.createConversation([id]);
            const newConv = res.data;
            setConversations(prev => prev.find(p => p.id === newConv.id) ? prev : [newConv, ...prev]);
            setActiveChat(newConv);
          } catch (e) { console.error(e); }
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchCommunities = async () => {
    try {
      const { data } = await api.get('/communities');
      const myId = currentUser?._id || currentUser?.id;
      setCommunities((Array.isArray(data) ? data : []).filter(c => c.isMember || c.is_member || c.creatorId === myId || c.isCreator));
    } catch (err) { console.error(err); }
  };

  const fetchMessages = async convId => {
    try {
      const { data } = await chatService.getMessages(convId);
      setMessages(Array.isArray(data) ? data : []);
      setTimeout(scrollToBottom, 100);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchConversations(); fetchCommunities(); }, []);
  useEffect(() => { if (activeChat?.id) fetchMessages(activeChat.id); }, [activeChat?.id]);

  useEffect(() => {
    if (!newChatSearch.trim() || newChatSearch.trim().length < 2) { setNewChatResults([]); return; }
    const timer = setTimeout(async () => {
      setNewChatSearching(true);
      try {
        const { data } = await api.get(`/discover/search?q=${encodeURIComponent(newChatSearch)}`);
        setNewChatResults(Array.isArray(data) ? data.slice(0, 10) : []);
      } catch { setNewChatResults([]); }
      finally { setNewChatSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [newChatSearch]);

  useEffect(() => {
    if (!on) return;
    const unsubOnline = on('user_online', ({ userId }) => setOnlineUsers(prev => new Set([...prev, userId])));
    const unsubOffline = on('user_offline', ({ userId }) => setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s; }));
    return () => { unsubOnline?.(); unsubOffline?.(); };
  }, [on]);

  useEffect(() => {
    if (!on) return;
    const unsub = on('receive_message', msg => {
      const myId = currentUser?._id || currentUser?.id;
      const senderId = msg.senderId || msg.sender_id;
      if (activeChat && msg.conversationId === activeChat.id && senderId?.toString() !== myId?.toString()) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
      setConversations(prev => prev.map(c => c.id === msg.conversationId ? { ...c, lastMessage: msg.text || msg.content, lastAt: msg.timestamp || msg.sentAt } : c));
    });
    return () => unsub?.();
  }, [on, activeChat, currentUser]);

  const handleStartChat = async userId => {
    setShowNewChat(false); setNewChatSearch(''); setNewChatResults([]);
    try {
      const res = await chatService.createConversation([userId]);
      const newConv = res.data;
      setConversations(prev => prev.find(p => p.id === newConv.id) ? prev : [newConv, ...prev]);
      setActiveChat(newConv);
      navigate(`/chat/${newConv.id}`);
    } catch (err) { console.error(err); }
  };

  const handleSendMessage = e => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !socket) return;
    socket.emit('send_message', { conversationId: activeChat.id, text: inputText.trim() });
    const myId = currentUser?._id || currentUser?.id;
    setMessages(prev => [...prev, { id: Date.now().toString(), senderId: myId, text: inputText.trim(), sentAt: new Date().toISOString() }]);
    setInputText('');
    scrollToBottom();
  };

  const handleForwardMessage = convIds => {
    if (!forwardMsg || !socket) return;
    for (const convId of convIds) socket.emit('send_message', { conversationId: convId, text: forwardMsg.text });
    setForwardMsg(null);
  };

  if (loading) return <ChatSkeleton />;

  const myId = currentUser?._id || currentUser?.id;
  const otherUserId = activeChat?.otherUser?._id || activeChat?.otherUser?.id;
  const isOtherOnline = otherUserId && onlineUsers.has(otherUserId);

  return (
    <div className="fixed inset-x-0 top-16 bottom-16 md:static md:h-[calc(100vh-10rem)] flex bg-background md:bg-background/50 md:backdrop-blur-xl md:rounded-3xl overflow-hidden border-0 md:border border-border md:shadow-2xl shadow-black/50">
      <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-accent/10 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-black tracking-tight text-primary">Messages</h2>
            <button onClick={() => setShowNewChat(true)} className="h-8 w-8 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all" title="New Message"><Plus size={16} /></button>
          </div>
          <div className="flex gap-1 p-1 bg-accent/30 rounded-xl">
            <button onClick={() => setSidebarTab('chats')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${sidebarTab === 'chats' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'}`}>Chats</button>
            <button onClick={() => setSidebarTab('groups')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${sidebarTab === 'groups' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'}`}>Groups</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarTab === 'chats' ? (
            conversations.filter(c => !c.isGroup).length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <p>No conversations yet.</p>
                <button onClick={() => setShowNewChat(true)} className="mt-2 text-primary text-xs font-bold hover:underline">Start a new chat</button>
              </div>
            ) : conversations.filter(c => !c.isGroup).map((conv, idx) => {
              const otherId = conv.otherUser?._id || conv.otherUser?.id;
              const online = otherId && onlineUsers.has(otherId);
              return (
                <motion.button key={conv.id || idx} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay: idx * 0.04 }}
                  onClick={() => { setActiveChat(conv); navigate(`/chat/${conv.id}`); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${activeChat?.id === conv.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-accent/50 border border-transparent'}`}>
                  <div className="relative flex-shrink-0">
                    <Avatar src={conv.otherUser?.avatarUrl || conv.otherUser?.avatar_url} name={conv.otherUser?.name} size="12" className="ring-2 ring-primary/10" />
                    {online && <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-background rounded-full" />}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm truncate group-hover:text-primary">{conv.otherUser?.name}</h4>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-1">{safeFormat(conv.lastAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || 'No messages yet'}</p>
                  </div>
                </motion.button>
              );
            })
          ) : (
            communities.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <p>No groups joined yet.</p>
                <button onClick={() => navigate('/communities')} className="mt-2 text-primary text-xs font-bold hover:underline">Browse Communities</button>
              </div>
            ) : communities.map((community, idx) => {
              const convId = community.conversationId;
              return (
                <motion.button key={community._id || idx} initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }} transition={{ delay: idx * 0.04 }}
                  onClick={() => { if (!convId) { navigate('/communities'); return; } setActiveChat({ id: convId, isGroup: true, groupName: community.name, groupAvatar: null }); navigate(`/chat/${convId}`); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group hover:bg-accent/50 border ${activeChat?.id === convId ? 'bg-primary/20 border-primary/30' : 'border-transparent'}`}>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/30 to-blue-600/30 flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-sm">{(community.name || 'G')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-bold text-sm truncate group-hover:text-primary">{community.name}</h4>
                    <p className="text-xs text-muted-foreground">{community.memberCount || 0} members</p>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col min-h-0 bg-background/20 ${activeChat ? 'flex' : 'hidden md:flex items-center justify-center'}`}>
        {activeChat ? (
          <>
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-md">
              <button onClick={() => { setActiveChat(null); navigate('/chat'); }} className="md:hidden p-1.5 hover:bg-accent rounded-lg"><ChevronLeft size={20} /></button>
              <Avatar src={activeChat.isGroup ? activeChat.groupAvatar : (activeChat.otherUser?.avatarUrl || activeChat.otherUser?.avatar_url)} name={activeChat.isGroup ? activeChat.groupName : activeChat.otherUser?.name} size="10" />
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm leading-tight truncate">{activeChat.isGroup ? activeChat.groupName : activeChat.otherUser?.name}</h3>
                {!activeChat.isGroup && (
                  <p className={`text-[10px] uppercase tracking-widest font-bold ${isOtherOnline ? 'text-emerald-500' : 'text-muted-foreground'}`}>{isOtherOnline ? 'Online' : 'Offline'}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => navigate('/webinar')} className="p-2 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-primary" title="Video"><Video size={18} /></button>
                <div className="relative">
                  <button onClick={() => setShowChatMenu(v => !v)} className="p-2 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-primary"><MoreVertical size={18} /></button>
                  <AnimatePresence>
                    {showChatMenu && (
                      <motion.div initial={{ opacity:0, scale:0.9, y:-8 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9, y:-8 }}
                        className="absolute right-0 top-10 z-30 bg-background border border-border rounded-2xl shadow-2xl py-1 min-w-[160px]">
                        <button onClick={() => { setShowChatMenu(false); if (otherUserId) navigate(`/profile/${otherUserId}`); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors">View Profile</button>
                        <button onClick={() => { setMessages([]); setShowChatMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors text-destructive">Clear Chat</button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {showChatMenu && <div className="fixed inset-0 z-20" onClick={() => setShowChatMenu(false)} />}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 min-h-0">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId?.toString() === myId?.toString();
                  return (
                    <MessageBubble key={msg.id || idx} msg={msg} isMe={isMe}
                      onDelete={() => setMessages(prev => prev.filter((_, i) => i !== idx))}
                      onForward={() => { setForwardMsg(msg); setShowForward(true); }} />
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 p-3 bg-background/95 backdrop-blur-md border-t border-border">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-accent/30 px-3 py-2 rounded-2xl border border-border/50">
                <textarea rows={1} placeholder="Type a message..." className="flex-1 bg-transparent border-none outline-none py-1.5 px-1 text-sm resize-none max-h-24 font-medium"
                  value={inputText} onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} />
                <button type="submit" disabled={!inputText.trim() || !isConnected} className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 flex-shrink-0"><Send size={16} /></button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-6 p-8 opacity-60">
            <MessageCircle size={64} className="text-primary/50" />
            <div className="space-y-2 text-center">
              <h2 className="text-3xl font-black tracking-tight">Your Inbox</h2>
              <p className="text-muted-foreground max-w-sm">Select a conversation or tap + to start a new one.</p>
            </div>
            <button onClick={() => setShowNewChat(true)} className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-2"><Plus size={20} /> New Message</button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showNewChat && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={e => e.target === e.currentTarget && setShowNewChat(false)}>
            <motion.div initial={{ scale:0.95, y:20 }} animate={{ scale:1, y:0 }} exit={{ scale:0.95, y:20 }}
              className="bg-background border border-border rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-black">New Message</h3>
                  <button onClick={() => setShowNewChat(false)} className="p-2 hover:bg-accent rounded-xl transition-colors"><X size={20} /></button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
                  <input type="text" placeholder="Search people..." value={newChatSearch} onChange={e => setNewChatSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-accent/20 border border-border outline-none focus:ring-2 focus:ring-primary/50" autoFocus />
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto p-4">
                {newChatSearching ? (
                  <div className="text-center py-8 text-muted-foreground">Searching...</div>
                ) : newChatResults.length > 0 ? (
                  <div className="space-y-2">
                    {newChatResults.map(u => (
                      <button key={u._id || u.id} onClick={() => handleStartChat(u._id || u.id)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all">
                        <Avatar src={u.avatarUrl || u.avatar_url} name={u.name} size="12" />
                        <div className="flex-1 text-left">
                          <p className="font-bold text-sm">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.location || 'No location'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : newChatSearch.trim().length >= 2 ? (
                  <div className="text-center py-8 text-muted-foreground">No users found</div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Type to search for people</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showForward && (
        <ForwardModal conversations={conversations} onClose={() => { setShowForward(false); setForwardMsg(null); }} onForward={handleForwardMessage} />
      )}
    </div>
  );
};

export default Chat;