import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, Hash, MessageSquare, Crown, Shield, UserMinus, Lock, Unlock, ArrowLeft, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Avatar from '../components/Avatar';

export default function CommunityDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const myId = user?._id || user?.id;

  const fetchCommunity = async () => {
    try {
      const { data } = await api.get(`/communities/${id}`);
      setCommunity(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCommunity(); }, [id]);

  const isAdmin = community?.isCreator || community?.creatorId === myId ||
    community?.members?.find(m => (m._id || m.id) === myId)?.role === 'admin';

  const handleRemove = async (userId) => {
    setActionLoading(userId);
    try {
      await api.delete(`/communities/${id}/members/${userId}`);
      setCommunity(prev => ({ ...prev, members: prev.members.filter(m => (m._id || m.id) !== userId) }));
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handleMakeAdmin = async (userId) => {
    setActionLoading(userId + '_admin');
    try {
      await api.put(`/communities/${id}/members/${userId}/admin`);
      setCommunity(prev => ({ ...prev, members: prev.members.map(m => (m._id || m.id) === userId ? { ...m, role: 'admin' } : m) }));
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
    finally { setActionLoading(null); }
  };

  const handlePrivacy = async (policy) => {
    try {
      await api.put(`/communities/${id}/privacy`, { messagingPolicy: policy });
      setCommunity(prev => ({ ...prev, messagingPolicy: policy }));
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
  };

  if (loading) return (
    <div className="max-w-lg mx-auto pb-24 space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="glass-card p-4 rounded-2xl animate-pulse h-16" />)}
    </div>
  );

  if (!community) return <div className="text-center py-20 text-muted-foreground">Community not found</div>;

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-xl transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black tracking-tight">{community.name}</h1>
          <p className="text-xs text-muted-foreground">{community.memberCount || community.members?.length || 0} members</p>
        </div>
        {community.conversationId && (
          <button onClick={() => navigate(`/chat/${community.conversationId}`)}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:scale-105 transition-all">
            <MessageSquare size={16} />
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="glass-card rounded-2xl border border-border p-5 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/30 to-blue-600/30 flex items-center justify-center border border-primary/20">
            <Users size={24} className="text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Hash size={12} className="text-primary" />
              <span className="text-xs font-black text-primary tracking-widest">{community.shortCode}</span>
            </div>
            {community.description && <p className="text-xs text-muted-foreground mt-1">{community.description}</p>}
          </div>
        </div>

        {/* Privacy toggle — admin only */}
        {isAdmin && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Messaging Policy</p>
            <div className="flex gap-2">
              <button onClick={() => handlePrivacy('everyone')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${community.messagingPolicy !== 'admins_only' ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'}`}>
                <Unlock size={12} /> Everyone
              </button>
              <button onClick={() => handlePrivacy('admins_only')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${community.messagingPolicy === 'admins_only' ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'}`}>
                <Lock size={12} /> Admins Only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Members */}
      <div className="glass-card rounded-2xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">{community.members?.length || 0} Members</p>
        </div>
        <div className="divide-y divide-border/50">
          {(community.members || []).map((m, i) => {
            const memberId = m._id || m.id;
            const isMe = memberId === myId;
            const isMemberAdmin = m.role === 'admin';
            return (
              <motion.div key={memberId || i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition-colors">
                <Avatar src={m.avatarUrl} name={m.name} size="10" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold truncate">{m.name}{isMe ? ' (You)' : ''}</p>
                    {isMemberAdmin && (
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded uppercase">Admin</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">@{m.shortId || memberId?.slice(0, 8)}</p>
                </div>
                {isAdmin && !isMe && (
                  <div className="flex gap-1">
                    {!isMemberAdmin && (
                      <button onClick={() => handleMakeAdmin(memberId)} disabled={actionLoading === memberId + '_admin'}
                        title="Make Admin" className="p-1.5 rounded-lg hover:bg-amber-500/20 text-muted-foreground hover:text-amber-400 transition-all">
                        <Shield size={14} />
                      </button>
                    )}
                    <button onClick={() => handleRemove(memberId)} disabled={actionLoading === memberId}
                      title="Remove" className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all">
                      <UserMinus size={14} />
                    </button>
                  </div>
                )}
                {!isAdmin && !isMe && (
                  <button onClick={() => navigate(`/profile/${memberId}`)}
                    className="text-[10px] font-bold text-primary hover:underline">View</button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
