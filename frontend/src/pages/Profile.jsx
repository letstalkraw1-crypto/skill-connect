import { Edit3, MapPin, Calendar, Link as LinkIcon, Instagram, Github, Chrome, MessageCircle, UserPlus, Check, X, Shield, Star, Camera, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getAssetUrl, safeFormat } from '../utils/utils';
import EditProfileModal from '../components/EditProfileModal';
import { userService, connectionService, authService, notificationService } from '../services/api';
import React from 'react';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState([]);
  const [activeTab, setActiveTab] = useState('skills');
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const fileInputRef = React.useRef(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data } = await userService.getProfile(id);
      setUser(data);
      const connData = await connectionService.getConnections(id);
      setConnections(connData.connections || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationService.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
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
    fetchProfile();
    if (currentUser?._id === id) {
      fetchNotifications();
    }
  }, [id, currentUser]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const { data } = await authService.updateAvatar(formData);
      setUser(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
    } catch (err) {
      console.error(err);
      alert('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (formData) => {
    try {
      const { data } = await userService.updateProfile(formData);
      setUser(data);
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-primary animate-pulse">Loading Profile...</div>;
  if (!user) return <div className="text-center py-20 text-muted-foreground">User not found</div>;

  const isOwnProfile = currentUser?._id === id || currentUser?.id === id;

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
              <img 
                src={getAssetUrl(user.avatarUrl, user.name)} 
                className="h-full w-full object-cover rounded-2xl border-4 border-background"
                alt={user.name} 
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
                <p className="text-2xl font-bold text-emerald-500">12</p>
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
                <button className="h-12 w-12 flex items-center justify-center rounded-2xl bg-accent border border-border hover:bg-accent/80 transition-all">
                  <UserPlus size={20} />
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right: Skills & Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-1 rounded-2xl flex">
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
                  {user.skills?.map((skill, idx) => (
                    <div key={idx} className="glass-card p-6 rounded-2xl border-l-4 border-primary group hover:border-emerald-500 transition-all">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-primary/20 text-primary group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-colors">
                          <Star size={20} />
                        </div>
                        <div className="px-2 py-1 bg-accent rounded text-[10px] font-bold uppercase tracking-wider">{skill.proficiency || "Advanced"}</div>
                      </div>
                      <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{skill.name || skill.skillName}</h4>
                      <p className="text-xs text-muted-foreground mt-1 mb-4 flex items-center gap-1">
                        <Shield size={12} />
                        {skill.years_exp || skill.yearsExp || 2} Years Experience
                      </p>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium">Progress</span>
                          <span className="text-xs font-bold">80%</span>
                        </div>
                        <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: '80%' }} className="h-full bg-primary" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!user.skills || user.skills.length === 0) && (
                    <div className="col-span-full py-20 text-center text-muted-foreground bg-accent/20 rounded-2xl border border-dashed border-border flex flex-col items-center gap-4">
                      <Star size={40} className="text-accent/50" />
                      <p>No skills added yet.</p>
                      {isOwnProfile && <button className="bg-primary px-6 py-2 rounded-xl text-primary-foreground font-bold">Add My First Skill</button>}
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
                      <div className="h-16 w-16 bg-accent rounded-2xl mb-3 border border-border group-hover:border-primary transition-colors p-1">
                        <img src={getAssetUrl(conn.avatarUrl)} className="h-full w-full object-cover rounded-xl" />
                      </div>
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
    </div>
  );
};

export default Profile;
