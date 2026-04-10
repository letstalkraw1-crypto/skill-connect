import { Edit3, MapPin, Calendar, Link as LinkIcon, Instagram, Github, Chrome, MessageCircle, UserPlus, Check, X, Shield, Star, Camera, Loader2, PlusCircle } from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl, safeFormat } from '../utils/utils';
import EditProfileModal from '../components/EditProfileModal';
import AddSkillModal from '../components/AddSkillModal';
import Avatar from '../components/Avatar';
import { userService, connectionService, authService, notificationService } from '../services/api';
import ProfileSkeleton from '../components/ProfileSkeleton';
import { useSocketContext } from '../context/SocketContext';
import OAuthButtons from '../components/OAuthButtons';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser, updateUser } = useAuth();
  const { on } = useSocketContext() || {};
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [connPagination, setConnPagination] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'pending' | 'accepted'
  const [connectLoading, setConnectLoading] = useState(false);
  const [points, setPoints] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'skills');
// ... rest of state ...
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const fetchProfile = async (connPage = 1) => {
    if (connPage === 1) setLoading(true);
    try {
      const { data } = await userService.getProfile(id);
      setUser(data);

      // Calculate points
      let pts = 0;
      if (data.bio) pts += 5;
      if (data.avatarUrl) pts += 5;
      if (data.location) pts += 2;
      pts += (data.skills?.length || 0) * 2;
      setPoints(pts);

      const connRes = await connectionService.getConnections(id, connPage);
      const acceptedConns = connRes.data.connections || [];
      setConnections(acceptedConns);
      // Add points for accepted connections
      setPoints(p => p + acceptedConns.length * 3);
      setConnPagination({
        page: connRes.data.page,
        totalPages: connRes.data.totalPages,
        totalConnections: connRes.data.totalConnections
      });

      // Fetch connection status with this user (only if viewing someone else's profile)
      const myId = currentUser?._id || currentUser?.id;
      if (myId && myId !== id) {
        try {
          const allConns = await connectionService.getConnections(myId);
          const pending = allConns.data.pending || [];
          const outgoing = allConns.data.outgoing || [];
          const accepted = allConns.data.connections || [];
          if (accepted.some(c => (c._id || c.id) === id)) setConnectionStatus('accepted');
          else if (outgoing.some(c => (c._id || c.id) === id)) setConnectionStatus('pending');
          else if (pending.some(c => (c._id || c.id) === id)) setConnectionStatus('incoming');
          else setConnectionStatus(null);
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (connectLoading || connectionStatus) return;
    setConnectLoading(true);
    try {
      await connectionService.sendRequest(id);
      setConnectionStatus('pending');
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to send request');
    } finally {
      setConnectLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const { data } = await notificationService.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markAsRead = async () => {
    if (unreadCount === 0) return;
    try {
      await notificationService.markAsRead();
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  useEffect(() => {
    // Only fetch notifications if it's the current user's profile
    if (currentUser && (currentUser._id === id || currentUser.id === id)) {
      fetchNotifications();
    }
  }, [id, currentUser?.id, currentUser?._id]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }

    // Handle verification status messages
    const verification = searchParams.get('verification');
    const skill = searchParams.get('skill');
    const message = searchParams.get('message');

    if (verification) {
      if (verification === 'success') {
        alert(`✅ Skill "${skill}" verified successfully!`);
      } else if (verification === 'failed') {
        alert(`❌ ${message || 'Verification criteria not met'}`);
      } else if (verification === 'cancelled') {
        alert('⚠️ Verification cancelled');
      } else if (verification === 'error') {
        alert(`❌ Verification error: ${message || 'Unknown error'}`);
      }
      
      // Clean up URL
      searchParams.delete('verification');
      searchParams.delete('skill');
      searchParams.delete('message');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams]);

  // Real-time: update connect button when request is accepted/declined
  useEffect(() => {
    if (!on) return;
    const unsubAccepted = on('connection_accepted', ({ connectionId }) => {
      setConnectionStatus('accepted');
    });
    const unsubDeclined = on('connection_declined', () => {
      setConnectionStatus(null);
    });
    return () => { unsubAccepted(); unsubDeclined(); };
  }, [on]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const { data } = await authService.updateAvatar(formData);
      const newAvatarUrl = data.avatarUrl || data.avatar_url || data.url;
      setUser(prev => ({ ...prev, avatarUrl: newAvatarUrl }));
      updateUser({ avatarUrl: newAvatarUrl });
    } catch (err) {
      console.error('Avatar upload failed:', err);
      const msg = err?.response?.data?.error || err.message || 'Failed to upload photo';
      alert(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
      // Reset file input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdateProfile = async (formData) => {
    try {
      const { data } = await userService.updateProfile(formData);
      setUser(data);
      updateUser(data);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleSaveSkill = async (skills) => {
    try {
      await userService.addSkills(skills);
      await fetchProfile();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  if (loading && !user) return <ProfileSkeleton />;
  if (!user) return <div className="text-center py-20 text-muted-foreground">User not found</div>;

  const isOwnProfile = currentUser?._id === id || currentUser?.id === id;

  const handleFetchConnections = (page) => {
    fetchProfile(page);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Hero Header */}
      <div className="relative group overflow-hidden rounded-3xl h-[400px]">
        {/* Cover Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-blue-600/10 to-transparent"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-30"></div>
        
        {/* Profile Info Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-black/40 backdrop-blur-[2px]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <div className="h-40 w-40 rounded-3xl bg-gradient-to-br from-primary to-blue-600 p-1 mb-6 shadow-2xl shadow-primary/30 relative">
              <Avatar 
                src={user.avatarUrl} 
                name={user.name} 
                size="40"
                loading="eager"
                className="h-full w-full rounded-2xl border-4 border-background"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="text-white animate-spin" size={32} />
                </div>
              )}
            </div>
            {isOwnProfile && (
              <>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 h-10 w-10 rounded-xl bg-background text-foreground flex items-center justify-center shadow-lg hover:bg-accent transition-colors z-10"
                >
                  <Camera size={18} />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </>
            )}
          </motion.div>

          <motion.div
            initial={{ y: 0, opacity: 1 }}
            className="text-center"
          >
            <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">{user.name}</h1>
            <p className="text-white font-black text-xl mb-6 bg-primary/20 backdrop-blur-md px-4 py-1 rounded-full border border-white/20 inline-block">
              @{user.shortId || user.short_id}
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-1.5 text-white/80 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                <MapPin size={16} />
                <span className="text-sm">{user.location || 'Coimbatore'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/80 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                <Calendar size={16} />
                <span className="text-sm">Joined {safeFormat(user.createdAt, 'MMMM yyyy')}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Bio & Stats */}
        <div className="lg:col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">About Me</h3>
            <p className="text-sm text-muted-foreground leading-relaxed italic border-l-4 border-primary/20 pl-4">
              {user.bio || "No bio yet. Passionate about learning and sharing skills with the community."}
            </p>
            
            <div className="flex gap-4 pt-4 border-t border-border">
              {user.instagramId && (
                <a href={`https://instagram.com/${user.instagramId}`} className="h-10 w-10 flex items-center justify-center rounded-xl bg-accent text-rose-500 hover:scale-110 transition-all">
                  <Instagram size={20} />
                </a>
              )}
              {user.githubId && (
                <a href={`https://github.com/${user.githubId}`} className="h-10 w-10 flex items-center justify-center rounded-xl bg-accent text-foreground hover:scale-110 transition-all">
                  <Github size={20} />
                </a>
              )}
              <a href="#" className="h-10 w-10 flex items-center justify-center rounded-xl bg-accent text-blue-400 hover:scale-110 transition-all">
                <Chrome size={20} />
              </a>
              {isOwnProfile && (
                <button 
                  onClick={() => setShowEditModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold text-xs hover:bg-primary/20 transition-all ml-auto"
                >
                  <Edit3 size={14} />
                  Edit Profile
                </button>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Stats & Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-accent/30 rounded-xl text-center border border-border/50">
                <p className="text-2xl font-bold text-primary">{connections.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mt-1">Connections</p>
              </div>
              <div className="p-4 bg-accent/30 rounded-xl text-center border border-border/50">
                <p className="text-2xl font-bold text-emerald-500">{points}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter mt-1">Points</p>
              </div>
            </div>
            {!isOwnProfile && (
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate(`/chat/${user._id || user.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-2xl font-bold font-sm shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  <MessageCircle size={18} />
                  Message
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connectLoading || connectionStatus === 'accepted' || connectionStatus === 'pending'}
                  className={`h-12 w-12 flex items-center justify-center rounded-2xl border transition-all ${
                    connectionStatus === 'accepted'
                      ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500'
                      : connectionStatus === 'pending'
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-500'
                      : 'bg-accent border-border hover:bg-primary hover:text-primary-foreground hover:border-primary'
                  }`}
                  title={connectionStatus === 'accepted' ? 'Connected' : connectionStatus === 'pending' ? 'Request Sent' : 'Connect'}
                >
                  {connectLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : connectionStatus === 'accepted' ? (
                    <Check size={18} />
                  ) : (
                    <UserPlus size={20} />
                  )}
                </button>
              </div>
            )}
          </motion.div>

          {isOwnProfile && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary">Verify Skills</h3>
              <p className="text-xs text-muted-foreground">Connect your accounts to automatically verify your skills</p>
              <OAuthButtons />
            </motion.div>
          )}
        </div>

        {/* Right: Skills & Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-1 rounded-2xl flex items-center">
            <div className="flex-1 flex">
              {['skills', 'connections', 'activity'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold capitalize transition-all ${
                    activeTab === tab ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {isOwnProfile && activeTab === 'skills' && (
              <button 
                onClick={() => setShowAddSkillModal(true)}
                className="mx-2 h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                title="Add New Skill"
              >
                <PlusCircle size={20} />
              </button>
            )}
          </div>

          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {activeTab === 'skills' && (
                <motion.div
                  key="skills"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {user.skills?.map((skill, idx) => {
                    return (
                    <div key={idx} className="glass-card p-6 rounded-2xl border-l-4 border-primary group hover:border-emerald-500 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 text-primary group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-colors">
                          <Star size={20} />
                        </div>
                        <div className="flex items-center gap-2">
                          {skill.isVerified && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-full">
                              <Check size={10} /> Verified
                            </span>
                          )}
                          {skill.verificationStatus === 'pending' && !skill.isVerified && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded-full">Pending</span>
                          )}
                          <div className="px-2 py-1 bg-accent rounded text-[10px] font-bold uppercase tracking-wider">{skill.proficiency || skill.level || 'Beginner'}</div>
                        </div>
                      </div>
                      <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{skill.name}</h4>
                      {skill.subSkill && <p className="text-xs text-primary font-bold -mt-1 mb-2">{skill.subSkill}</p>}
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Shield size={12} />
                        {skill.yearsExp || skill.years_exp || 0} {(skill.yearsExp || skill.years_exp || 0) === 1 ? 'Year' : 'Years'} Experience
                      </p>
                    </div>
                    );
                  })}
                  {(!user.skills || user.skills.length === 0) && (
                    <div className="col-span-full py-20 text-center text-muted-foreground bg-accent/20 rounded-2xl border border-dashed border-border flex flex-col items-center gap-4">
                      <Star size={40} className="text-accent/50" />
                      <p>No skills added yet.</p>
                      {isOwnProfile && (
                        <button 
                          onClick={() => setShowAddSkillModal(true)}
                          className="bg-primary px-6 py-2 rounded-xl text-primary-foreground font-bold shadow-lg shadow-primary/25 hover:scale-105 active:scale-95 transition-all"
                        >
                          Add My First Skill
                        </button>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'connections' && (
                <motion.div
                  key="connections"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                  {connections.map((conn, idx) => (
                    <div key={idx} className="glass-card p-4 rounded-2xl flex flex-col items-center text-center group">
                      <Avatar src={conn.avatarUrl} name={conn.name} size="16" className="mb-3 group-hover:border-primary transition-colors" />
                      <h5 className="text-sm font-bold truncate w-full px-2">{conn.name}</h5>
                      <p className="text-[10px] text-muted-foreground mt-1">{conn.location || 'Coimbatore'}</p>
                      <button 
                        onClick={() => navigate(`/profile/${conn._id || conn.id}`)}
                        className="mt-4 px-4 py-1.5 bg-accent/50 hover:bg-primary hover:text-primary-foreground rounded-xl text-[10px] font-bold tracking-wider transition-all"
                      >
                        VIEW PROFILE
                      </button>
                    </div>
                  ))}
                  {connections.length === 0 && (
                    <div className="col-span-full py-20 text-center text-muted-foreground">No connections yet</div>
                  )}

                  {connPagination && connPagination.totalPages > 1 && (
                    <div className="col-span-full flex justify-center gap-2 py-4">
                      {Array.from({ length: connPagination.totalPages }, (_, i) => i + 1).map(pageNum => (
                        <button
                          key={pageNum}
                          onClick={() => handleFetchConnections(pageNum)}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                            connPagination.page === pageNum 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-accent hover:bg-accent/80'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'activity' && (
                <motion.div
                  key="activity"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {!isOwnProfile ? (
                    <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center opacity-20">
                         <Shield size={32} />
                      </div>
                      <p className="font-bold text-sm">Activity is private</p>
                      <p className="text-xs text-muted-foreground -mt-2 italic text-center">Only {user.name} can see their recent notifications.</p>
                    </div>
                  ) : notificationsLoading ? (
                    <div className="py-20 text-center animate-pulse text-primary font-bold tracking-widest uppercase text-xs">Synchronizing Activity...</div>
                  ) : notifications.length === 0 ? (
                    <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center opacity-20">
                         <Calendar size={32} />
                      </div>
                      <p className="font-bold text-sm">No recent activity found.</p>
                      <p className="text-xs text-muted-foreground -mt-2 italic text-center">Follow people or interact with posts to see updates here.</p>
                    </div>
                  ) : (
                    notifications.map((n, idx) => (
                      <div key={n._id || n.id || idx} className="glass-card p-4 rounded-2xl flex items-center gap-4 hover:bg-accent/30 transition-all group">
                        <Avatar src={n.senderId?.avatarUrl} name={n.senderId?.name} size="10" className="group-hover:ring-2 ring-primary transition-all" />
                        <div className="flex-1">
                          <p className="text-sm font-bold group-hover:text-primary transition-colors">{n.message || 'System Notification'}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1 opacity-60">{safeFormat(n.createdAt)}</p>
                        </div>
                        {n.type === 'connection_request' && (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" title="Pending Action"></div>
                        )}
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <EditProfileModal 
            user={user} 
            onClose={() => setShowEditModal(false)} 
            onSave={handleUpdateProfile} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddSkillModal && (
          <AddSkillModal 
            onClose={() => setShowAddSkillModal(false)} 
            onSave={handleSaveSkill} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
