import { Edit3, MapPin, Calendar, Link as LinkIcon, Instagram, Github, Chrome, MessageCircle, UserPlus, Check, X, Shield, Star, Camera, Loader2, PlusCircle, Copy, Flame, Mic2, Play, LogOut } from 'lucide-react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl, safeFormat } from '../utils/utils';
import EditProfileModal from '../components/EditProfileModal';
import ConnectionSearchModal from '../components/ConnectionSearchModal';
import Avatar from '../components/Avatar';
import { userService, connectionService, authService, notificationService } from '../services/api';
import ProfileSkeleton from '../components/ProfileSkeleton';
import { useSocketContext } from '../context/SocketContext';
import OAuthButtons from '../components/OAuthButtons';

// ─── Video Submissions Tab ────────────────────────────────────────────────────
const VideoSubmissionsTab = ({ userId, isOwnProfile, streakCount, activeDays, totalVideos }) => {
  const [videos, setVideos] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedVideo, setSelectedVideo] = React.useState(null);

  React.useEffect(() => {
    import('../services/api').then(({ default: api }) => {
      api.get('/daily-challenge/my-submissions')
        .then(({ data }) => setVideos(data))
        .catch(console.error)
        .finally(() => setLoading(false));
    });
  }, [userId]);

  return (
    <motion.div key="videos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="space-y-4">
      {/* Streak stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 rounded-2xl text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame size={14} className="text-amber-400" />
          </div>
          <p className="text-xl font-black text-amber-400">{streakCount || 0}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Streak</p>
        </div>
        <div className="glass-card p-4 rounded-2xl text-center">
          <p className="text-xl font-black text-primary">{totalVideos || 0}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Videos</p>
        </div>
        <div className="glass-card p-4 rounded-2xl text-center">
          <p className="text-xl font-black text-emerald-400">{activeDays || 0}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Active Days</p>
        </div>
      </div>

      {/* Video list */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="glass-card p-4 rounded-2xl animate-pulse h-20" />)}
        </div>
      )}

      {!loading && videos.length === 0 && (
        <div className="py-16 text-center text-muted-foreground bg-accent/20 rounded-2xl border border-dashed border-border flex flex-col items-center gap-3">
          <Mic2 size={36} className="text-accent/50" />
          <p className="font-bold text-sm">No videos yet</p>
          {isOwnProfile && <p className="text-xs">Submit your first daily challenge to get started</p>}
        </div>
      )}

      {!loading && videos.map((video, idx) => (
        <motion.div key={video._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
          onClick={() => setSelectedVideo(video)}
          className="glass-card p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-all group">
          {/* Thumbnail / play icon */}
          <div className="h-14 w-20 rounded-xl bg-black flex items-center justify-center flex-shrink-0 overflow-hidden relative">
            <video src={video.videoUrl} className="w-full h-full object-cover opacity-70" preload="metadata" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-primary/80 transition-colors">
                <Play size={14} className="text-white ml-0.5" />
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate">{video.challenge?.topic || 'Daily Challenge'}</p>
            {video.caption && <p className="text-xs text-muted-foreground truncate mt-0.5">{video.caption}</p>}
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-muted-foreground font-bold">
                {new Date(video.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              {video.feedbackCount > 0 && (
                <span className="text-[10px] text-primary font-bold">{video.feedbackCount} feedback</span>
              )}
            </div>
          </div>
          <Play size={16} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </motion.div>
      ))}

      {/* Video modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedVideo(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-lg bg-background rounded-3xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <p className="font-black text-sm">{selectedVideo.challenge?.topic || 'Daily Challenge'}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selectedVideo.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => setSelectedVideo(null)}
                  className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className="bg-black aspect-video">
                <video src={selectedVideo.videoUrl} controls autoPlay playsInline className="w-full h-full object-contain" />
              </div>
              {selectedVideo.caption && (
                <div className="p-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">{selectedVideo.caption}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser, updateUser, logout } = useAuth();
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
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'videos');
// ... rest of state ...
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConnectionSearchModal, setShowConnectionSearchModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const fileInputRef = React.useRef(null);

  const fetchProfile = async (connPage = 1) => {
    if (connPage === 1) setLoading(true);
    try {
      const { data } = await userService.getProfile(id);
      
      // CRITICAL: Only update local state, never update auth context for other users
      setUser(data);

      // Calculate points
      let pts = 0;
      if (data.bio) pts += 5;
      if (data.avatarUrl) pts += 5;
      if (data.location) pts += 2;
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
      // Reset state when viewing a different profile
      setUser(null);
      setConnections([]);
      setConnectionStatus(null);
      setPoints(0);
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
    const message = searchParams.get('message');

    if (verification) {
      if (verification === 'success') {
        alert(`✅ Verification successful!`);
      } else if (verification === 'failed') {
        alert(`❌ ${message || 'Verification criteria not met'}`);
      } else if (verification === 'cancelled') {
        alert('⚠️ Verification cancelled');
      } else if (verification === 'error') {
        alert(`❌ Verification error: ${message || 'Unknown error'}`);
      }
      
      // Clean up URL
      searchParams.delete('verification');
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
      
      // Only update auth context if this is your own profile
      const myId = currentUser?._id || currentUser?.id;
      if (myId === id) {
        updateUser({ avatarUrl: newAvatarUrl });
      }
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
      
      // Only update auth context if this is your own profile
      const myId = currentUser?._id || currentUser?.id;
      if (myId === id) {
        updateUser(data);
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleCopyUrl = async () => {
    const baseUrl = window.location.origin;
    const shareableUrl = `${baseUrl}/u/${user.shortId || user.short_id}`;
    
    try {
      await navigator.clipboard.writeText(shareableUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
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
            
            {isOwnProfile && (user.shortId || user.short_id) && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-bold text-muted-foreground mb-2">SHAREABLE PROFILE URL</p>
                <button
                  onClick={handleCopyUrl}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-accent/50 hover:bg-accent rounded-xl text-xs font-mono text-foreground transition-all group"
                >
                  <LinkIcon size={14} className="text-primary" />
                  <span className="flex-1 text-left truncate">/u/{user.shortId || user.short_id}</span>
                  {copiedUrl ? (
                    <Check size={14} className="text-emerald-500" />
                  ) : (
                    <Copy size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </button>
                {copiedUrl && (
                  <p className="text-xs text-emerald-500 font-bold mt-1">Copied!</p>
                )}
              </div>
            )}
            
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
                <div className="flex gap-2 ml-auto">
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-primary/10 text-primary border border-primary/20 rounded-xl font-bold text-xs hover:bg-primary/20 transition-all"
                  >
                    <Edit3 size={14} />
                    Edit Profile
                  </button>
                  <button 
                    onClick={logout}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl font-bold text-xs hover:bg-destructive/20 transition-all"
                    title="Logout"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
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

        </div>

        {/* Right: Videos & Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-1 rounded-2xl flex items-center">
            <div className="flex-1 flex">
              {['videos', 'connections', 'activity'].map(tab => (
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
            {isOwnProfile && activeTab === 'connections' && (
              <button 
                onClick={() => setShowConnectionSearchModal(true)}
                className="mx-2 h-10 w-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                title="Add Connection"
              >
                <PlusCircle size={20} />
              </button>
            )}
          </div>

          <div className="min-h-[400px]">
            <AnimatePresence mode="wait">
              {activeTab === 'videos' && (
                <VideoSubmissionsTab userId={id} isOwnProfile={isOwnProfile} streakCount={user.streakCount} activeDays={user.activeDays} totalVideos={user.totalVideos} />
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
                  {connections.length === 0 && isOwnProfile && (
                    <div className="col-span-full py-20 text-center">
                      <button
                        onClick={() => setShowConnectionSearchModal(true)}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all"
                      >
                        <PlusCircle size={20} />
                        Add My First Connection
                      </button>
                    </div>
                  )}
                  {connections.length === 0 && !isOwnProfile && (
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

      <ConnectionSearchModal
        isOpen={showConnectionSearchModal}
        onClose={() => setShowConnectionSearchModal(false)}
        onConnectionSent={() => fetchProfile()}
      />
    </div>
  );
};

export default Profile;
