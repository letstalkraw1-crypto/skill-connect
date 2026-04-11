import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, Trash2, Gamepad2, Upload } from 'lucide-react';
import { userService } from '../services/api';
import api from '../services/api';

const PRESET_GAMES = ['BGMI', 'Free Fire', 'Valorant', 'COD Mobile', 'Chess'];
const GAMING_ROLES = ['Fragger', 'Sniper', 'Support', 'IGL (In-Game Leader)', 'All-rounder'];

const EditSkillModal = ({ skill, onClose, onUpdate, onDelete }) => {
  const [proficiency, setProficiency] = useState(skill.proficiency || skill.level || 'Beginner');
  const [yearsExp, setYearsExp] = useState(skill.yearsExp || skill.years_exp || 0);
  const [verificationLink, setVerificationLink] = useState(skill.verificationLink || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Gaming-specific state
  const [selectedGame, setSelectedGame] = useState(skill.subSkill || '');
  const [customGame, setCustomGame] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [gamingRole, setGamingRole] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false);

  const isGaming = skill.name === 'Online Gaming';

  const getOAuthProvider = (skillName) => {
    const s = skillName.toLowerCase();
    if (s.includes('running') || s.includes('cycling') || s.includes('swimming')) return 'strava';
    if (s.includes('coding') || s.includes('programming')) return 'github';
    return null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedSkill = {
        name: skill.name,
        subSkill: skill.subSkill,
        proficiency,
        yearsExp: parseInt(yearsExp) || 0,
        verificationLink: verificationLink.trim() || null,
      };
      await onUpdate(updatedSkill);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update skill');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitGamingVerification = async () => {
    if (!screenshotFile && !playerId) {
      alert('Please provide at least a Player ID or a new screenshot');
      return;
    }
    setUploadingScreenshot(true);
    try {
      const formData = new FormData();
      if (screenshotFile) formData.append('certificate', screenshotFile);
      formData.append('skillName', 'Online Gaming');
      formData.append('verificationType', 'gaming');
      formData.append('gamingDetails', JSON.stringify({
        game: selectedGame === 'Other' ? customGame : selectedGame,
        customGame: selectedGame === 'Other' ? customGame : '',
        playerId,
        role: gamingRole,
      }));
      await api.post('/profile/verifications', formData);
      alert('✅ Verification submitted! Admin will review within 24 hours.');
      onClose();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to submit verification');
    } finally {
      setUploadingScreenshot(false);
    }
  };

  const handleVerify = async () => {
    const provider = getOAuthProvider(skill.name);
    if (provider) {
      setSaving(true);
      try {
        const updatedSkill = { name: skill.name, subSkill: skill.subSkill, proficiency, yearsExp: parseInt(yearsExp) || 0, verificationLink: verificationLink.trim() || null };
        await onUpdate(updatedSkill);
        const token = localStorage.getItem('token');
        if (!token) { alert('Please log in to verify skills'); return; }
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;
        await new Promise(resolve => setTimeout(resolve, 500));
        const { data: profile } = await userService.getProfile(userId);
        const savedSkill = profile.skills?.find(s => s.name.toLowerCase() === skill.name.toLowerCase());
        if (savedSkill) {
          const skillId = savedSkill.userSkillId || savedSkill._id || savedSkill.id;
          window.location.href = `/api/auth/oauth/${provider}?skillId=${skillId}&skillName=${encodeURIComponent(skill.name)}`;
        } else {
          alert('Skill updated but verification failed. Please try again.');
          setSaving(false);
        }
      } catch (err) {
        console.error('Verification error:', err);
        alert('Failed to start verification. Please try again.');
        setSaving(false);
      }
    } else {
      handleSave();
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${skill.name}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(skill.name);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete skill');
    } finally {
      setDeleting(false);
    }
  };

  const provider = getOAuthProvider(skill.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-background border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-accent/10">
          <div>
            <h2 className="text-xl font-black tracking-tight text-primary">Edit Skill</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">{skill.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Proficiency Level */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Proficiency Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['Beginner', 'Intermediate', 'Expert'].map(level => (
                <button key={level} onClick={() => setProficiency(level)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${proficiency === level ? 'bg-primary text-primary-foreground border-primary' : 'bg-accent/10 border-border hover:border-primary/50'}`}>
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Years of Experience */}
          <div className="space-y-3">
            <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Years of Experience</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setYearsExp(Math.max(0, yearsExp - 1))}
                className="h-9 w-9 rounded-xl bg-accent border border-border font-bold text-lg flex items-center justify-center hover:bg-accent/80 transition-all">−</button>
              <span className="flex-1 text-center text-2xl font-black text-primary">{yearsExp}</span>
              <button onClick={() => setYearsExp(Math.min(30, yearsExp + 1))}
                className="h-9 w-9 rounded-xl bg-accent border border-border font-bold text-lg flex items-center justify-center hover:bg-accent/80 transition-all">+</button>
            </div>
          </div>

          {/* Gaming-specific verification section */}
          {isGaming ? (
            <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
              <div className="flex items-center gap-2">
                <Gamepad2 size={16} className="text-primary" />
                <span className="text-xs font-black uppercase text-primary tracking-widest">Update Gaming Verification</span>
                {skill.isVerified && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-full uppercase">Verified</span>
                )}
                {skill.verificationStatus === 'pending' && !skill.isVerified && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded-full uppercase">Pending Review</span>
                )}
              </div>

              {/* Game selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Game</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_GAMES.map(game => (
                    <button key={game} onClick={() => setSelectedGame(game)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedGame === game ? 'bg-primary text-primary-foreground border-primary' : 'bg-accent/10 border-border hover:border-primary/50'}`}>
                      {game}
                    </button>
                  ))}
                  <button onClick={() => setSelectedGame('Other')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${selectedGame === 'Other' ? 'bg-primary text-primary-foreground border-primary' : 'bg-accent/10 border-border hover:border-primary/50'}`}>
                    Other
                  </button>
                </div>
                {selectedGame === 'Other' && (
                  <input type="text" placeholder="Enter game name..."
                    value={customGame} onChange={e => setCustomGame(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-accent/20 border border-border outline-none focus:ring-2 focus:ring-primary/50 text-sm mt-2" />
                )}
              </div>

              {/* Player ID */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">In-Game Player ID / UID</label>
                <input type="text" placeholder="e.g. 5123456789"
                  value={playerId} onChange={e => setPlayerId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-accent/20 border border-border outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
              </div>

              {/* Role */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Your Role</label>
                <div className="flex flex-wrap gap-2">
                  {GAMING_ROLES.map(role => (
                    <button key={role} onClick={() => setGamingRole(gamingRole === role ? '' : role)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${gamingRole === role ? 'bg-primary text-primary-foreground border-primary' : 'bg-accent/10 border-border hover:border-primary/50'}`}>
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screenshot upload */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Upload New Rank Screenshot</label>
                <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/30 border border-dashed border-border cursor-pointer hover:border-primary/50 transition-all">
                  <Upload size={18} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {screenshotFile ? (
                      <p className="text-sm font-bold text-primary truncate">{screenshotFile.name}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">Choose screenshot (JPG, PNG)</p>
                    )}
                  </div>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden"
                    onChange={e => setScreenshotFile(e.target.files[0])} />
                </label>
              </div>

              <button onClick={handleSubmitGamingVerification} disabled={uploadingScreenshot}
                className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {uploadingScreenshot ? <Loader2 size={18} className="animate-spin" /> : <Gamepad2 size={18} />}
                {uploadingScreenshot ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </div>
          ) : (
            /* Regular verification link for non-gaming skills */
            <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-primary tracking-widest">Verification Link</span>
                {skill.isVerified && (
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-full uppercase">Verified</span>
                )}
              </div>
              <input type="url"
                placeholder={provider === 'github' ? 'https://github.com/username' : provider === 'strava' ? 'https://www.strava.com/athletes/...' : 'https://...'}
                value={verificationLink} onChange={(e) => setVerificationLink(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-accent/20 border border-border outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
              {verificationLink.trim() && (
                <button type="button" onClick={handleVerify} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <span>🔗</span>}
                  {saving ? (provider ? 'Verifying...' : 'Saving...') : provider ? `Verify with ${provider === 'github' ? 'GitHub' : 'Strava'}` : 'Save with Link'}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-accent/5 flex gap-3">
          <button onClick={handleDelete} disabled={deleting || saving}
            className="px-6 py-3.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-sm uppercase tracking-[0.1em] hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
            Delete
          </button>
          <button onClick={handleSave} disabled={saving || deleting}
            className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EditSkillModal;
