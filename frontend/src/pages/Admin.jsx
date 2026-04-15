import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart3, Shield, CheckCircle, XCircle, Edit2, Trash2, Eye, LogOut, Download } from 'lucide-react';
import axios from 'axios';

const API_BASE = '/api/admin';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Data states
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [verifications, setVerifications] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
      loadData();
    }
  }, [token, activeTab]);

  const login = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_BASE}/login`, { password });
      setToken(data.token);
      localStorage.setItem('adminToken', data.token);
      setIsAuthenticated(true);
    } catch (err) {
      setError('Invalid admin password');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken('');
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
    setPassword('');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = { 'x-admin-token': token };
      
      if (activeTab === 'stats') {
        const { data } = await axios.get(`${API_BASE}/stats`, { headers });
        setStats(data);
      } else if (activeTab === 'users') {
        const { data } = await axios.get(`${API_BASE}/users`, { headers });
        setUsers(data);
      } else if (activeTab === 'events') {
        const { data } = await axios.get(`${API_BASE}/events`, { headers });
        setEvents(data);
      } else if (activeTab === 'verifications') {
        const { data } = await axios.get(`${API_BASE}/verifications`, { headers });
        setVerifications(data);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      }
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const viewUser = async (userId) => {
    try {
      const headers = { 'x-admin-token': token };
      const { data } = await axios.get(`${API_BASE}/users/${userId}`, { headers });
      setSelectedUser(data);
      setEditMode(false);
    } catch (err) {
      setError('Failed to load user details');
    }
  };

  const updateUser = async (userId, updates) => {
    try {
      const headers = { 'x-admin-token': token };
      await axios.put(`${API_BASE}/users/${userId}`, updates, { headers });
      alert('User updated successfully');
      setEditMode(false);
      loadData();
      viewUser(userId);
    } catch (err) {
      alert('Failed to update user');
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const headers = { 'x-admin-token': token };
      await axios.delete(`${API_BASE}/users/${userId}`, { headers });
      alert('User deleted successfully');
      setSelectedUser(null);
      loadData();
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const reviewVerification = async (verificationId, status, adminNote = '') => {
    try {
      const headers = { 'x-admin-token': token };
      await axios.put(`${API_BASE}/verifications/${verificationId}`, { status, adminNote }, { headers });
      alert(`Verification ${status}`);
      loadData();
    } catch (err) {
      alert('Failed to review verification');
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      const headers = { 'x-admin-token': token };
      await axios.delete(`${API_BASE}/events/${eventId}`, { headers });
      alert('Event deleted successfully');
      loadData();
    } catch (err) {
      alert('Failed to delete event');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background border border-border rounded-3xl p-8 w-full max-w-md shadow-2xl"
        >
          <div className="flex items-center justify-center mb-6">
            <Shield className="text-primary" size={48} />
          </div>
          <h1 className="text-2xl font-black text-center mb-2">Admin Panel</h1>
          <p className="text-sm text-muted-foreground text-center mb-6">Enter admin password to continue</p>
          
          <form onSubmit={login} className="space-y-4">
            <input
              type="password"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-accent/20 border border-border outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-accent/5">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="text-primary" size={32} />
            <div>
              <h1 className="text-xl font-black">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">Manage your platform</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'stats', label: 'Dashboard', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'verifications', label: 'Verifications', icon: CheckCircle },
            { id: 'daily', label: 'Daily Challenge', icon: Shield },
            { id: 'retention', label: 'Retention', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedUser(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-accent/20 hover:bg-accent/40'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-10">Loading...</div>}
        {error && <div className="text-red-500 text-center py-4">{error}</div>}

        {activeTab === 'stats' && stats && <StatsView stats={stats} />}
        {activeTab === 'users' && <UsersView users={users} onViewUser={viewUser} token={token} />}
        {activeTab === 'verifications' && <VerificationsView verifications={verifications} onReview={reviewVerification} />}
        {activeTab === 'daily' && <DailyChallengeAdmin token={token} />}
        {activeTab === 'retention' && <CohortRetentionView token={token} />}
      </div>

      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          editMode={editMode}
          onClose={() => setSelectedUser(null)}
          onEdit={() => setEditMode(true)}
          onSave={(updates) => updateUser(selectedUser._id, updates)}
          onDelete={() => deleteUser(selectedUser._id)}
        />
      )}
    </div>
  );
};

const StatsView = ({ stats }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard title="Total Users" value={stats.totalUsers} />
    <StatCard title="Connections" value={stats.totalConnections} />
    <StatCard title="Messages" value={stats.totalMessages} />
    <StatCard title="Conversations" value={stats.totalConversations} />
    
    <div className="md:col-span-2 lg:col-span-4 bg-accent/10 border border-border rounded-2xl p-6">
      <h3 className="text-lg font-bold mb-4">Top Skills</h3>
      <div className="space-y-2">
        {stats.skillBreakdown.slice(0, 10).map(skill => (
          <div key={skill.id} className="flex items-center justify-between p-3 bg-background rounded-xl">
            <span className="font-bold">{skill.name}</span>
            <span className="text-primary">{skill.count} users</span>
          </div>
        ))}
      </div>
    </div>

    <div className="md:col-span-2 lg:col-span-4 bg-accent/10 border border-border rounded-2xl p-6">
      <h3 className="text-lg font-bold mb-4">Recent Users</h3>
      <div className="space-y-2">
        {stats.recentUsers.map(user => (
          <div key={user._id} className="flex items-center gap-3 p-3 bg-background rounded-xl">
            <img src={user.avatarUrl || '/default-avatar.png'} alt={user.name} className="w-10 h-10 rounded-full" />
            <div className="flex-1">
              <p className="font-bold">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <span className="text-xs text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const StatCard = ({ title, value }) => (
  <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-border rounded-2xl p-6">
    <p className="text-sm text-muted-foreground mb-2">{title}</p>
    <p className="text-3xl font-black text-primary">{value}</p>
  </div>
);

const UsersView = ({ users, onViewUser, token }) => {
  const exportToExcel = () => {
    const headers = ['Name', 'Email', 'Phone', 'Location', 'Skills', 'Connections', 'Joined'];
    const rows = users.map(u => [
      u.name || '',
      u.email || '',
      u.phone || '',
      u.location || '',
      u.skillCount || 0,
      u.connectionCount || 0,
      new Date(u.createdAt).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collabro-users-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-sm font-bold hover:bg-emerald-500/20 transition-all">
          <Download size={16} /> Export to Excel
        </button>
      </div>
      <div className="bg-accent/10 border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent/20">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Skills</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Connections</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Joined</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user._id} className="border-t border-border hover:bg-accent/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <img src={user.avatarUrl || '/default-avatar.png'} alt={user.name} className="w-8 h-8 rounded-full" />
                      <span className="font-bold">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3 text-sm">{user.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm">{user.skillCount}</td>
                  <td className="px-4 py-3 text-sm">{user.connectionCount}</td>
                  <td className="px-4 py-3 text-sm">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => onViewUser(user._id)}
                      className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all text-sm">
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const VerificationsView = ({ verifications, onReview }) => (
  <div className="grid gap-4">
    {verifications.length === 0 && (
      <div className="text-center py-10 text-muted-foreground">No pending verifications</div>
    )}
    {verifications.map(v => (
      <div key={v._id} className="bg-accent/10 border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img src={v.user?.avatarUrl || '/default-avatar.png'} alt={v.user?.name} className="w-12 h-12 rounded-full" />
            <div>
              <p className="font-bold">{v.user?.name}</p>
              <p className="text-sm text-muted-foreground">{v.user?.email}</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs font-bold">Pending</span>
        </div>
        <div className="mb-4 space-y-1">
          <p className="text-sm"><span className="font-bold">Skill:</span> {v.skillName}</p>
          <p className="text-sm"><span className="font-bold">Type:</span> {v.verificationType}</p>
          <p className="text-sm"><span className="font-bold">Submitted:</span> {new Date(v.createdAt).toLocaleString()}</p>

          {/* Gaming-specific details */}
          {v.verificationType === 'gaming' && v.gamingDetails && (
            <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-xl space-y-1">
              <p className="text-xs font-black uppercase text-primary tracking-widest mb-2">🎮 Gaming Details</p>
              <p className="text-sm"><span className="font-bold">Game:</span> {v.gamingDetails.customGame || v.gamingDetails.game}</p>
              <p className="text-sm"><span className="font-bold">Player ID:</span> {v.gamingDetails.playerId || '—'}</p>
              <p className="text-sm"><span className="font-bold">Role:</span> {v.gamingDetails.role || '—'}</p>
            </div>
          )}

          {/* Screenshot / Certificate */}
          {v.certificateUrl && (
            <div className="mt-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                {v.verificationType === 'gaming' ? 'Rank Screenshot' : 'Certificate'}
              </p>
              <a href={v.certificateUrl} target="_blank" rel="noopener noreferrer">
                <img src={v.certificateUrl} alt="Proof"
                  className="max-h-64 w-full rounded-xl border border-border object-contain bg-accent/20 cursor-pointer hover:opacity-90 transition-opacity"
                  onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
                />
                <a href={v.certificateUrl} target="_blank" rel="noopener noreferrer"
                  style={{display:'none'}}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-all">
                  📎 View Screenshot
                </a>
              </a>
            </div>
          )}
          {v.url && (
            <p className="text-sm"><span className="font-bold">Link:</span>{' '}
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{v.url}</a>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onReview(v._id, 'verified')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500/20 transition-all"
          >
            <CheckCircle size={18} />
            Approve
          </button>
          <button
            onClick={() => onReview(v._id, 'rejected')}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
          >
            <XCircle size={18} />
            Reject
          </button>
        </div>
      </div>
    ))}
  </div>
);

const EventsView = ({ events, onDelete }) => (
  <div className="grid gap-4">
    {events.map(event => (
      <div key={event._id} className="bg-accent/10 border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-2">{event.title}</h3>
            <p className="text-sm text-muted-foreground mb-2">{event.venueName}</p>
            <p className="text-sm"><span className="font-bold">Date:</span> {new Date(event.datetime).toLocaleString()}</p>
            <p className="text-sm"><span className="font-bold">Community:</span> {event.communityId?.name || 'N/A'}</p>
            <p className="text-sm"><span className="font-bold">Creator:</span> {event.creatorId?.name || 'N/A'}</p>
          </div>
          <button
            onClick={() => onDelete(event._id)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
          >
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>
    ))}
  </div>
);

const UserDetailModal = ({ user, editMode, onClose, onEdit, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    location: user.location || '',
    bio: user.bio || '',
    password: '',
  });
  const [activeTab, setActiveTab] = useState('profile');

  const handleSave = () => {
    const updates = {};
    Object.keys(formData).forEach(key => {
      if (key === 'password') { if (formData.password) updates.password = formData.password; return; }
      if (formData[key] !== user[key]) updates[key] = formData[key];
    });
    onSave(updates);
  };

  const videos = user.challengeVideos || [];
  const totalStorageMB = videos.reduce((sum, v) => sum + (v.bytes ? v.bytes / 1024 / 1024 : 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-background border border-border rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-border flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-black">User Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-xl text-xl">×</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-border flex-shrink-0">
          {['profile', 'videos'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg text-xs font-bold capitalize transition-all ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {tab === 'videos' ? `Videos (${videos.length})` : 'Profile'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <img src={user.avatarUrl || '/default-avatar.png'} alt={user.name} className="w-20 h-20 rounded-full object-cover" />
                <div>
                  <p className="text-lg font-bold">{user.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {user.shortId}</p>
                  <p className="text-xs text-muted-foreground">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {editMode ? (
                <div className="space-y-3">
                  {[{ key: 'name', label: 'Name', type: 'text' }, { key: 'email', label: 'Email', type: 'email' }, { key: 'phone', label: 'Phone', type: 'tel' }, { key: 'location', label: 'Location', type: 'text' }].map(({ key, label, type }) => (
                    <div key={key}>
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">{label}</label>
                      <input type={type} value={formData[key]} onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                        className="w-full px-4 py-2 rounded-xl bg-accent/20 border border-border outline-none text-sm" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">Bio</label>
                    <textarea value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-accent/20 border border-border outline-none text-sm" rows={3} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 block">New Password</label>
                    <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl bg-accent/20 border border-border outline-none text-sm" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p><span className="font-bold">Email:</span> {user.email}</p>
                  <p><span className="font-bold">Phone:</span> {user.phone || '—'}</p>
                  <p><span className="font-bold">Location:</span> {user.location || '—'}</p>
                  <p><span className="font-bold">Bio:</span> {user.bio || '—'}</p>
                  <p><span className="font-bold">Skills:</span> {user.skills?.length || 0}</p>
                  <p><span className="font-bold">Connections:</span> {user.connections?.length || 0}</p>
                  <p><span className="font-bold">Streak:</span> {user.streakCount || 0} days</p>
                  <p><span className="font-bold">Total Videos:</span> {videos.length}</p>
                  <p><span className="font-bold">Total Storage:</span> {totalStorageMB.toFixed(1)} MB</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="space-y-3">
              {videos.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No videos submitted yet</p>}
              {videos.map(v => (
                <div key={v._id} className="p-4 bg-accent/10 border border-border rounded-2xl space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{v.challenge?.topic || 'Unknown challenge'}</p>
                      <p className="text-xs text-muted-foreground">{v.challenge?.date || '—'}</p>
                    </div>
                    <a href={v.videoUrl} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 flex-shrink-0">
                      ▶ View
                    </a>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span><span className="font-bold text-foreground">Uploaded:</span> {new Date(v.createdAt).toLocaleString()}</span>
                    <span><span className="font-bold text-foreground">Duration:</span> {v.duration ? `${Math.round(v.duration)}s` : '—'}</span>
                    <span><span className="font-bold text-foreground">Size:</span> {v.bytes ? `${(v.bytes / 1024 / 1024).toFixed(1)} MB` : '—'}</span>
                    <span><span className="font-bold text-foreground">Feedbacks:</span> {v.feedbackCount || 0}</span>
                    {v.caption && <span className="col-span-2"><span className="font-bold text-foreground">Caption:</span> {v.caption}</span>}
                    {v.aiAnalysis?.status === 'done' && (
                      <span className="col-span-2 text-violet-400 font-bold">🤖 AI Score: {v.aiAnalysis.scores?.overall}/10</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border flex gap-3 flex-shrink-0">
          {editMode ? (
            <>
              <button onClick={() => setFormData({ name: user.name||'', email: user.email||'', phone: user.phone||'', location: user.location||'', bio: user.bio||'', password: '' })}
                className="px-4 py-2 bg-accent/20 rounded-xl text-sm">Cancel</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-sm">Save Changes</button>
            </>
          ) : (
            <>
              <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm">
                <Edit2 size={16} /> Edit
              </button>
              <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl text-sm">
                <Trash2 size={16} /> Delete
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Admin;

// ─── Cohort Retention View ────────────────────────────────────────────────────
const CohortRetentionView = ({ token }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/cohort-retention', { headers: { 'x-admin-token': token } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading retention data...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black mb-1">Cohort Retention</h2>
        <p className="text-sm text-muted-foreground">Signup week → % who submitted a video → % who returned on day 2+</p>
      </div>
      <div className="bg-accent/10 border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent/20">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Week</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Signups</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Submitted Video</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Returned Day 2+</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.week} className="border-t border-border hover:bg-accent/5">
                  <td className="px-4 py-3 text-sm font-bold">{row.week}</td>
                  <td className="px-4 py-3 text-sm">{row.total}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden max-w-[80px]">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${row.submittedPct}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${row.submittedPct >= 50 ? 'text-emerald-400' : row.submittedPct >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                        {row.submittedPct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden max-w-[80px]">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${row.returnedPct}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${row.returnedPct >= 40 ? 'text-emerald-400' : row.returnedPct >= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                        {row.returnedPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ─── Daily Challenge Admin ────────────────────────────────────────────────────
const CohortRetentionView = ({ token }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/admin/cohort-retention', { headers: { 'x-admin-token': token } })
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-center py-10 text-muted-foreground">Loading retention data...</div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black mb-1">Cohort Retention</h2>
        <p className="text-sm text-muted-foreground">Signup week → % who submitted a video → % who returned on day 2+</p>
      </div>
      <div className="bg-accent/10 border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-accent/20">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Week</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Signups</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Submitted Video</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase">Returned Day 2+</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.week} className="border-t border-border hover:bg-accent/5">
                  <td className="px-4 py-3 text-sm font-bold">{row.week}</td>
                  <td className="px-4 py-3 text-sm">{row.total}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden max-w-[80px]">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${row.submittedPct}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${row.submittedPct >= 50 ? 'text-emerald-400' : row.submittedPct >= 25 ? 'text-amber-400' : 'text-red-400'}`}>
                        {row.submittedPct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden max-w-[80px]">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${row.returnedPct}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${row.returnedPct >= 40 ? 'text-emerald-400' : row.returnedPct >= 20 ? 'text-amber-400' : 'text-red-400'}`}>
                        {row.returnedPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
const DailyChallengeAdmin = ({ token }) => {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), topic: '', description: '', tips: '', dueTime: '23:59' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.topic.trim()) { setError('Topic is required'); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      await axios.post('/api/daily-challenge', {
        date: form.date,
        topic: form.topic.trim(),
        description: form.description.trim(),
        tips: form.tips.split('\n').map(t => t.trim()).filter(Boolean),
        dueTime: form.dueTime || '23:59',
      }, { headers });
      setSuccess(`✅ Challenge created for ${form.date}`);
      setForm(f => ({ ...f, topic: '', description: '', tips: '' }));
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <h2 className="text-xl font-black mb-4">Create Daily Challenge</h2>
      {success && <div className="mb-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm text-emerald-400">{success}</div>}
      {error && <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">{error}</div>}
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Date *</label>
          <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Topic / Question *</label>
          <input type="text" placeholder='e.g. "Tell me about yourself"'
            value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Description (optional)</label>
          <textarea rows={2} placeholder="Context or instructions for the user..."
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border outline-none text-sm resize-none" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Due Time (HH:MM)</label>
          <input type="time" value={form.dueTime} onChange={e => setForm(f => ({ ...f, dueTime: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border outline-none text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Tips (one per line, optional)</label>
          <textarea rows={3} placeholder={"Maintain eye contact\nSpeak clearly\nKeep it under 60 seconds"}
            value={form.tips} onChange={e => setForm(f => ({ ...f, tips: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border outline-none text-sm resize-none font-mono text-xs" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Challenge'}
        </button>
      </form>
    </div>
  );
};
