import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocketContext } from '../context/SocketContext';
import { Send, Image, Plus, MoreVertical, Phone, Video, Search, ChevronLeft, Paperclip, Smile, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl, safeFormat } from '../utils/utils';
import Avatar from '../components/Avatar';
import ChatSkeleton from '../components/ChatSkeleton';

const Chat = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const { socket, isConnected, on } = useSocketContext() || {};
  const [conversations, setConversations] = useState([]);
  const [communities, setCommunities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('chats'); // 'chats' | 'groups'
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const { data } = await chatService.listConversations();
      setConversations(data);

      if (id) {
        // First try to find in loaded conversations (includes group convs since backend returns all)
        const existing = data.find(c =>
          c.id === id ||
          c.otherUser?.id === id ||
          c.otherUser?._id === id
        );
        if (existing) {
          setActiveChat(existing);
        } else {
          // Could be a group conversation ID — try to open it directly
          try {
            const msgRes = await chatService.getMessages(id);
            if (msgRes.data) {
              // Build a minimal activeChat object so the chat window renders
              const groupConv = {
                id,
                isGroup: true,
                groupName: 'Group Chat',
                groupAvatar: null,
              };
              setActiveChat(groupConv);
            }
          } catch {
            // Not a group conv either — try creating 1:1
            try {
              const res = await chatService.createConversation([id]);
              const newConv = res.data;
              setConversations(prev => {
                const exists = prev.find(p => p.id === newConv.id);
                return exists ? prev : [newConv, ...prev];
              });
              setActiveChat(newConv);
            } catch (createErr) {
              console.error('Failed to auto-create conversation:', createErr);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommunities = async () => {
    try {
      const apiModule = await import('../services/api');
      const { data } = await apiModule.default.get('/communities');
      const myId = currentUser?._id || currentUser?.id;
      // Only show communities the user is a member of or created
      setCommunities((data || []).filter(c =>
        c.isMember || c.is_member || c.creatorId === myId || c.isCreator
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMessages = async (convId) => {
    try {
      const { data } = await chatService.getMessages(convId);
      setMessages(data.messages || []);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConversations();
    fetchCommunities();
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat]);

  useEffect(() => {
    if (!on) return;
    const unsub = on('receive_message', (msg) => {
      const myId = currentUser?._id || currentUser?.id;
      const senderId = msg.senderId || msg.sender_id;
      if (activeChat && msg.conversationId === activeChat.id) {
        if (senderId?.toString() !== myId?.toString()) {
          setMessages(prev => [...prev, msg]);
          scrollToBottom();
        }
      }
      setConversations(prev => prev.map(c =>
        c.id === msg.conversationId
          ? { ...c, lastMessage: msg.text || msg.content, lastAt: msg.timestamp || msg.sentAt }
          : c
      ));
    });
    return unsub;
  }, [on, activeChat, currentUser]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeChat || !socket) return;

    socket.emit('send_message', {
      conversationId: activeChat.id,
      text: inputText.trim()
    });

    // Optimistic UI update
    const newMessage = {
      id: Date.now().toString(),
      senderId: currentUser._id || currentUser.id,
      text: inputText.trim(),
      sentAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    scrollToBottom();
  };

  if (loading) return <ChatSkeleton />;

  const MediaRenderer = ({ url }) => {
    if (!url) return null;
    const resolvedUrl = getAssetUrl(url);
    const lowUrl = url.toLowerCase();
    
    if (['.jpg', '.png', '.webp', '.jpeg'].some(ext => lowUrl.includes(ext))) {
      return (
        <img 
          src={resolvedUrl} 
          alt="Shared media" 
          className="max-w-full rounded-xl cursor-pointer hover:opacity-90 transition-opacity" 
          onClick={() => window.open(resolvedUrl, '_blank')}
        />
      );
    }
    
    if (['.mp3', '.webm', '.ogg', '.wav'].some(ext => lowUrl.includes(ext))) {
      return <audio controls src={resolvedUrl} className="max-w-full h-8" />;
    }

    return <span>{url}</span>;
  };

  return (
    <div className="fixed inset-x-0 top-16 bottom-16 md:static md:h-[calc(100vh-10rem)] flex bg-background md:bg-background/50 md:backdrop-blur-xl md:rounded-3xl overflow-hidden border-0 md:border border-border md:shadow-2xl shadow-black/50">
      {/* Sidebar: Conversations */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-accent/10 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-border space-y-3">
          <h2 className="text-xl font-black tracking-tight text-primary px-2">Messages</h2>
          {/* Chats / Groups toggle */}
          <div className="flex gap-1 p-1 bg-accent/30 rounded-xl">
            <button onClick={() => setSidebarTab('chats')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${sidebarTab === 'chats' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'}`}>
              Chats
            </button>
            <button onClick={() => setSidebarTab('groups')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${sidebarTab === 'groups' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground'}`}>
              Groups
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {sidebarTab === 'chats' ? (
            conversations.filter(c => !c.isGroup).map((conv, idx) => {
              const displayName = conv.otherUser?.name;
              const displayAvatar = conv.otherUser?.avatarUrl || conv.otherUser?.avatar_url;
              return (
                <motion.button key={conv.id || idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                  onClick={() => { setActiveChat(conv); navigate(`/chat/${conv.id}`); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group ${activeChat?.id === conv.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-accent/50 border border-transparent'}`}>
                  <div className="relative">
                    <Avatar src={displayAvatar} name={displayName} size="12" className="ring-2 ring-primary/10" />
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-emerald-500 border-2 border-background rounded-full"></div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{displayName}</h4>
                      <span className="text-[10px] text-muted-foreground">{safeFormat(conv.lastAt)}</span>
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
              const handleOpen = () => {
                if (!convId) {
                  // No conversation yet — redirect to communities to join/trigger creation
                  navigate('/communities');
                  return;
                }
                const groupConv = {
                  id: convId,
                  isGroup: true,
                  groupName: community.name,
                  groupAvatar: null,
                };
                setActiveChat(groupConv);
                navigate(`/chat/${convId}`);
              };
              return (
                <motion.button key={community._id || idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                  onClick={handleOpen}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all group hover:bg-accent/50 border ${activeChat?.id === convId ? 'bg-primary/20 border-primary/30' : 'border-transparent'}`}>
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/30 to-blue-600/30 flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <span className="text-primary font-black text-sm">{(community.name || 'G')[0].toUpperCase()}</span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{community.name}</h4>
                    <p className="text-xs text-muted-foreground">{community.memberCount || community.member_count || 0} members</p>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div className={`flex-1 flex flex-col min-h-0 bg-background/20 ${activeChat ? 'flex' : 'hidden md:flex items-center justify-center opacity-50'}`}>
        {activeChat ? (
          <>
            {/* Header — fixed, never scrolls */}
            <div className="flex-shrink-0 h-16 border-b border-border px-4 flex items-center justify-between bg-background/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => { setActiveChat(null); navigate('/chat'); }} className="md:hidden p-1.5 hover:bg-accent rounded-lg">
                  <ChevronLeft size={20} />
                </button>
                <Avatar
                  src={activeChat.isGroup ? activeChat.groupAvatar : (activeChat.otherUser?.avatarUrl || activeChat.otherUser?.avatar_url)}
                  name={activeChat.isGroup ? activeChat.groupName : activeChat.otherUser?.name}
                  size="10"
                />
                <div>
                  <h3 className="font-bold text-sm leading-tight">{activeChat.isGroup ? activeChat.groupName : activeChat.otherUser?.name}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {activeChat.isGroup ? 'Group Chat' : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-foreground"><Phone size={18} /></button>
                <button className="p-2 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-foreground"><Video size={18} /></button>
                <button className="p-2 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-foreground"><MoreVertical size={18} /></button>
              </div>
            </div>

            {/* Messages Area — only this scrolls */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 custom-scrollbar min-h-0">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === (currentUser._id || currentUser.id);
                  const isMedia = msg.text?.includes('uploads/') || msg.text?.startsWith('http');
                  return (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="max-w-[78%] space-y-0.5">
                        <div className={`px-4 py-2.5 rounded-2xl shadow ${
                          isMe
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : 'bg-accent/60 rounded-tl-sm border border-border/50'
                        }`}>
                          {isMedia ? <MediaRenderer url={msg.text} /> : <p className="text-sm">{msg.text}</p>}
                        </div>
                        <p className={`text-[10px] text-muted-foreground px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          {safeFormat(msg.sentAt)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area — fixed at bottom, never scrolls */}
            <div className="flex-shrink-0 p-3 bg-background/95 backdrop-blur-md border-t border-border">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-accent/30 px-3 py-2 rounded-2xl border border-border/50">
                <button type="button" className="p-1.5 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-primary flex-shrink-0">
                  <Plus size={18} />
                </button>
                <textarea
                  rows={1}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent border-none outline-none py-1.5 px-1 text-sm resize-none max-h-24 font-medium"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || !isConnected}
                  className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 flex-shrink-0"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="h-32 w-32 rounded-3xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center animate-glow">
              <MessageCircle size={64} className="text-primary/50" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight">Your Inbox</h2>
              <p className="text-muted-foreground max-w-sm">Select a conversation or start a new one to communicate with other skilled individuals.</p>
            </div>
            <button 
              onClick={() => navigate('/discovery')}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-2"
            >
              <Search size={20} />
              Find People
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
