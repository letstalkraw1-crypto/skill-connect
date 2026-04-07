import React, { useState, useEffect } from 'react';
import { Users, Hash, MessageSquare, Crown, LogOut, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Avatar from '../components/Avatar';

export default function Communities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const myId = user?._id || user?.id;

  const fetchCommunities = async () => {
    try {
      const { data } = await api.get('/communities');
      setCommunities(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCommunities(); }, []);

  const handleJoinLeave = async (community) => {
    if (community.isCreator) return; // creator can't leave
    setActionLoading(community._id || community.id);
    try {
      const { data } = await api.post(`/communities/${community._id || community.id}/join`);
      setCommunities(prev => prev.map(c => {
        if ((c._id || c.id) === (community._id || community.id)) {
          return { ...c, isMember: data.joined, is_member: data.joined, memberCount: data.joined ? c.memberCount + 1 : c.memberCount - 1 };
        }
        return c;
      }));
      // If joined, navigate to the community chat
      if (data.joined && data.conversationId) {
        navigate(`/chat/${data.conversationId}`);
      }
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenChat = (community) => {
    if (community.conversationId) {
      navigate(`/chat/${community.conversationId}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Users size={24} className="text-primary" />
        <h1 className="text-2xl font-black tracking-tight">Communities</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="glass-card p-5 rounded-2xl animate-pulse h-32" />)}
        </div>
      ) : communities.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Users size={48} className="opacity-20" />
          <p className="font-bold">No communities yet</p>
          <p className="text-sm">Use the + button to create one</p>
        </div>
      ) : (
        <div className="space-y-4">
          {communities.map((community, idx) => {
            const id = community._id || community.id;
            const isMember = community.isMember || community.is_member;
            const isCreator = community.isCreator || community.creatorId === myId;
            const memberCount = community.memberCount || community.member_count || 0;
            const isLoading = actionLoading === id;

            return (
              <motion.div key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="glass-card rounded-2xl border border-border p-5">
                <div className="flex items-start gap-4">
                  {/* Avatar placeholder */}
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-600/30 flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <Users size={24} className="text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-black text-base">{community.name}</h3>
                      {isCreator && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">
                          <Crown size={10} /> Admin
                        </span>
                      )}
                      {isMember && !isCreator && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">Member</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mb-2">
                      <Hash size={12} className="text-primary" />
                      <span className="text-xs font-black text-primary tracking-widest">{community.shortCode || '—'}</span>
                    </div>

                    {community.description && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{community.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users size={12} /> {memberCount} members</span>
                      <span className="capitalize">{community.type || 'community'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  {isMember && (
                    <button onClick={() => handleOpenChat(community)}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                      <MessageSquare size={16} /> Open Chat
                    </button>
                  )}
                  {!isCreator && (
                    <button
                      onClick={() => handleJoinLeave(community)}
                      disabled={isLoading}
                      className={`${isMember ? 'flex-none px-4' : 'flex-1'} py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                        isMember
                          ? 'bg-accent text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-border'
                          : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground'
                      }`}>
                      {isLoading ? '...' : isMember ? <><LogOut size={16} /> Leave</> : 'Join Community'}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
