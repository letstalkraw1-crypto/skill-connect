import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { Send, Image, Plus, MoreVertical, Phone, Video, Search, ChevronLeft, Paperclip, Smile, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl, safeFormat } from '../utils/utils';
import Avatar from '../components/Avatar';
import ChatSkeleton from '../components/ChatSkeleton';

const Chat = () => {
  const { id } = useParams(); // Selected conversation ID or user ID
  const { user: currentUser } = useAuth();
  const { socket, isConnected } = useSocket(localStorage.getItem('token'));
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [loading, setLoading] = useState(true);
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
        const existing = data.find(c => c.id === id || c.otherUser?.id === id || c.otherUser?._id === id);
        if (existing) {
          setActiveChat(existing);
        } else {
          // If no existing conversation matches, try to create/fetch one with this User ID
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
  }, []);

  useEffect(() => {
    if (activeChat) {
      fetchMessages(activeChat.id);
    }
  }, [activeChat]);

  useEffect(() => {
    if (socket) {
      socket.on('receive_message', (msg) => {
        const myId = currentUser?._id || currentUser?.id;
        const senderId = msg.senderId || msg.sender_id;

        if (activeChat && msg.conversationId === activeChat.id) {
          // Skip if this is our own message — we already added it optimistically
          if (senderId?.toString() !== myId?.toString()) {
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
          }
        }
        // Update last message in sidebar
        setConversations(prev => prev.map(c =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: msg.text || msg.content, lastAt: msg.timestamp || msg.sentAt }
            : c
        ));
      });
    }
    return () => socket?.off('receive_message');
  }, [socket, activeChat, currentUser]);

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
    <div className="flex h-[calc(100vh-10rem)] bg-background/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-border shadow-2xl shadow-black/50">
      {/* Sidebar: Conversations */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-border flex flex-col bg-accent/10 ${activeChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-primary">Messages</h2>
            <button className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background/50 border border-border focus:ring-2 focus:ring-primary/50 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {conversations.map((conv, idx) => {
            const displayName = conv.isGroup ? conv.groupName : conv.otherUser?.name;
            const displayAvatar = conv.isGroup ? conv.groupAvatar : (conv.otherUser?.avatarUrl || conv.otherUser?.avatar_url);
            return (
              <motion.button
                key={conv.id || idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => { setActiveChat(conv); navigate(`/chat/${conv.id}`); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all group ${
                  activeChat?.id === conv.id ? 'bg-primary/20 border border-primary/30' : 'hover:bg-accent/50 hover:border-border/30 border border-transparent'
                }`}
              >
                <div className="relative">
                  <Avatar src={displayAvatar} name={displayName} size="14" className="ring-2 ring-primary/20" />
                  {!conv.isGroup && <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-emerald-500 border-2 border-background rounded-full"></div>}
                  {conv.isGroup && <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-primary border-2 border-background rounded-full flex items-center justify-center"><span className="text-[6px] text-white font-black">G</span></div>}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold truncate group-hover:text-primary transition-colors">{displayName}</h4>
                    <span className="text-[10px] text-muted-foreground font-bold">{safeFormat(conv.lastAt)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate font-medium">
                    {conv.lastMessage || 'No messages yet'}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Main: Chat Window */}
      <div className={`flex-1 flex flex-col relative bg-background/20 ${activeChat ? 'flex' : 'hidden md:flex items-center justify-center opacity-50'}`}>
        {activeChat ? (
          <>
            {/* Header */}
            <div className="h-20 border-b border-border px-6 flex items-center justify-between backdrop-blur-md bg-background/60 z-10">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveChat(null)} className="md:hidden p-2 hover:bg-accent rounded-lg">
                  <ChevronLeft size={20} />
                </button>
                <Avatar
                  src={activeChat.isGroup ? activeChat.groupAvatar : (activeChat.otherUser?.avatarUrl || activeChat.otherUser?.avatar_url)}
                  name={activeChat.isGroup ? activeChat.groupName : activeChat.otherUser?.name}
                  size="12"
                />
                <div>
                  <h3 className="font-bold">{activeChat.isGroup ? activeChat.groupName : activeChat.otherUser?.name}</h3>
                  <p className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    {activeChat.isGroup ? 'Group Chat' : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2.5 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-foreground"><Phone size={20} /></button>
                <button className="p-2.5 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-foreground"><Video size={20} /></button>
                <div className="w-[1px] h-6 bg-border mx-2"></div>
                <button className="p-2.5 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-foreground"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => {
                  const isMe = msg.senderId === (currentUser._id || currentUser.id);
                  const isMedia = msg.text?.includes('uploads/') || msg.text?.startsWith('http');
                  return (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] space-y-1`}>
                        <div className={`p-4 rounded-2xl shadow-xl ${
                          isMe 
                            ? 'bg-primary text-primary-foreground rounded-tr-none shadow-primary/20' 
                            : 'bg-accent/40 backdrop-blur-md rounded-tl-none border border-border shadow-black/20'
                        }`}>
                          {isMedia ? (
                             <MediaRenderer url={msg.text} />
                          ) : (
                             <p className="text-sm font-medium">{msg.text}</p>
                          )}
                        </div>
                        <p className={`text-[10px] text-muted-foreground font-bold uppercase tracking-widest ${isMe ? 'text-right' : 'text-left'}`}>
                          {safeFormat(msg.sentAt)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-background/40 backdrop-blur-md border-t border-border">
              <form onSubmit={handleSendMessage} className="flex items-end gap-3 glass-card p-2 rounded-2xl">
                <div className="flex gap-1 pb-1">
                  <button type="button" className="p-2 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-primary"><Plus size={20} /></button>
                  <button type="button" className="p-2 hover:bg-accent rounded-xl transition-colors text-muted-foreground hover:text-primary"><Smile size={20} /></button>
                </div>
                <textarea 
                  rows={1}
                  placeholder="Type a message..." 
                  className="flex-1 bg-transparent border-none outline-none py-2.5 px-2 text-sm resize-none custom-scrollbar max-h-32 focus:placeholder-primary/50 transition-all font-medium"
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
                  className="h-11 w-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send size={20} />
                </button>
              </form>
              <div className="mt-2 flex justify-center">
                <p className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors ${isConnected ? 'text-emerald-500' : 'text-destructive'}`}>
                  {isConnected ? 'Real-time Connection Encryption Active' : 'Disconnected - Reconnecting...'}
                </p>
              </div>
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
