import { useState, useEffect } from 'react';
import { Users, Hash, MessageSquare, Crown, LogOut, Settings, X, Shield, UserMinus, Lock, Unlock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Avatar from '../components/Avatar';

const AdminPanel = ({ community, onClose, onUpdate }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(community.messagingPolicy || 'everyone');

  useEffect(() => {
    api.get(`/communities/${community._id || community.id}`).then(({ data }) => {
      setMembers(data.members || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [community._id, community.id]);

  const handleRemove = async (userId) => {
    try {
      await api.delete(`/communities/${community._id || community.id}/members/${userId}`);
      setMembers(prev => prev.filter(m => (m._id || m.id) !== userId));
      onUpdate();
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
  };

  const handleMakeAdmin = async (userId) => {
    try {
      await api.put(`/communities/${community._id || community.id}/members/${userId}/admin`);
      setMembers(prev => prev.map(m => (m._id || m.id) === userId ? { ...m, role: 'admin' } : m));
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
  };

  const handlePrivacy = async (newPolicy) => {
    try {
      await api.put(`/communities/${community._id || community.id}/privacy`, { messagingPolicy: newPolicy });
      setPolicy(newPolicy);
      onUpdate();
    } catch (err) { alert(err?.response?.data?.error || 'Failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md glass-card rounded-3xl border border-border shadow-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-black text-lg">Manage — {community.name}</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>

        {/* Privacy Settings */}
        <div className="p-5 border-b border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Messaging Policy</p>
          <div className="flex gap-2">
            <button onClick={() => handlePrivacy('everyone')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${policy === 'everyone' ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'}`}>
              <Unlock size={14} /> Everyone
            </button>
            <button onClick={() => handlePrivacy('admins_only')}
              className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${policy === 'admins_only' ? 'bg-primary text-primary-foreground' : 'bg-accent text-muted-foreground'}`}>
              <Lock size={14} /> Admins Only
            </button>
          </div>
        </div>

        {/* Members List */}
        <div className="p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-primary mb-3">Members ({members.length})</p>
          {loading ? <div className="py-4 text-center text-muted-foreground animate-pulse text-sm">Loading...</div> : (
            <div className="space-y-2">
              {members.map((m, i) => (
                <div key={m._id || m.id || i} className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl">
                  <Avatar src={m.avatarUrl} name={m.name} size="10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{m.role || 'member'}</p>
                  </div>
                  {m.role !== 'admin' && (
                    <div className="flex gap-1">
                      <button onClick={() => handleMakeAdmin(m._id || m.id)} title="Make Admin"
                        className="p-1.5 rounded-lg hover:bg-amber-500/20 text-muted-foreground hover:text-amber-400 transition-all">
                        <Shield size={14} />
                      </button>
                      <button onClick={() => handleRemove(m._id || m.id)} title="Remove"
                        className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all">
                        <UserMinus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// Module-level cache
let _communitiesCache = null;

export default function Communities() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [adminCommunity, setAdminCommunity] = useState(null);

  const myId = user?._id || user?.id;

  const fetchCommunities = async (force = false) => {
    if (_communitiesCache && !force) {
      setCommunities(_communitiesCache);
      setLoading(false);
      api.get('/communities').then(({ data }) => { _communitiesCache = data; setCommunities(data); }).catch(() => {});
      return;
    }
    try {
      const { data } = await api.get('/communities');
      _communitiesCache = data;
      setCommunities(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCommunities(); }, []);

  const handleJoinLeave = async (community) => {
    if (community.isCreator) return;
    setActionLoading(community._id || community.id);
    try {
      const { data } = await api.post(`/communities/${community._id || community.id}/join`);
      setCommunities(prev => prev.map(c => {
        if ((c._id || c.id) === (community._id || community.id)) {
          return { ...c, isMember: data.joined, is_member: data.joined, memberCount: data.joined ? c.memberCount + 1 : c.memberCount - 1 };
        }
        return c;
      }));
      if (data.joined && data.conversationId) navigate(`/chat/${data.conversationId}`);
      else fetchCommunities(true); // force refresh after leave
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Users size={24} className="text-primary" />
        <h1 className="text-2xl font-black tracking-tight">Communities</h1>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="glass-card p-5 rounded-2xl animate-pulse h-32" />)}</div>
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
                className="glass-card rounded-2xl border border-border p-5 cursor-pointer hover:border-primary/30 transition-all"
                onClick={() => navigate(`/communities/${id}`)}>
                <div className="flex items-start gap-4">
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
                    {community.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{community.description}</p>}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users size={12} /> {memberCount} members</span>
                      <span className="capitalize">{community.type || 'community'}</span>
                      {community.messagingPolicy === 'admins_only' && (
                        <span className="flex items-center gap-1 text-amber-400"><Lock size={10} /> Admins only</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4" onClick={e => e.stopPropagation()}>
                  {isMember && (
                    <button onClick={() => community.conversationId && navigate(`/chat/${community.conversationId}`)}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
                      <MessageSquare size={16} /> Open Chat
                    </button>
                  )}
                  {isCreator && (
                    <button onClick={() => setAdminCommunity(community)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl bg-accent border border-border hover:bg-primary/10 hover:text-primary transition-all"
                      title="Manage Community">
                      <Settings size={16} />
                    </button>
                  )}
                  {!isCreator && (
                    <button onClick={() => handleJoinLeave(community)} disabled={isLoading}
                      className={`${isMember ? 'flex-none px-4' : 'flex-1'} py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
                        isMember ? 'bg-accent text-muted-foreground hover:bg-destructive/10 hover:text-destructive border border-border'
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

      <AnimatePresence>
        {adminCommunity && (
          <AdminPanel community={adminCommunity} onClose={() => setAdminCommunity(null)} onUpdate={() => fetchCommunities(true)} />
        )}
      </AnimatePresence>
    </div>
  );
}
