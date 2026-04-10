import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Star, Loader2, Trash2 } from 'lucide-react';
import { userService } from '../services/api';

const EditSkillModal = ({ skill, onClose, onUpdate, onDelete }) => {
  const [proficiency, setProficiency] = useState(skill.proficiency || skill.level || 'Beginner');
  const [yearsExp, setYearsExp] = useState(skill.yearsExp || skill.years_exp || 0);
  const [verificationLink, setVerificationLink] = useState(skill.verificationLink || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Determine OAuth provider based on skill name
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

  const handleVerify = async () => {
    const provider = getOAuthProvider(skill.name);
    
    if (provider) {
      // OAuth verification flow
      setSaving(true);
      try {
        // Save changes first
        const updatedSkill = {
          name: skill.name,
          subSkill: skill.subSkill,
          proficiency,
          yearsExp: parseInt(yearsExp) || 0,
          verificationLink: verificationLink.trim() || null,
        };
        
        await onUpdate(updatedSkill);

        // Get user ID and redirect to OAuth
        const token = localStorage.getItem('token');
        if (!token) {
          alert('Please log in to verify skills');
          return;
        }

        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;
        
        // Wait for update to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Fetch profile to get skill ID
        const { data: profile } = await userService.getProfile(userId);
        const savedSkill = profile.skills?.find(s => 
          s.name.toLowerCase() === skill.name.toLowerCase()
        );
        
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
      // Non-OAuth link - just save
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
                <button 
                  key={level}
                  onClick={() => setProficiency(level)}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    proficiency === level ? 'bg-primary text-primary-foreground border-primary' : 'bg-accent/10 border-border hover:border-primary/50'
                  }`}
                >
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

          {/* Verification Link */}
          <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-primary tracking-widest">Verification Link</span>
              {skill.isVerified && (
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-full uppercase">Verified</span>
              )}
            </div>
            <input
              type="url"
              placeholder={provider === 'github' ? 'https://github.com/username' : provider === 'strava' ? 'https://www.strava.com/athletes/...' : 'https://...'}
              value={verificationLink}
              onChange={(e) => setVerificationLink(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-accent/20 border border-border outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            
            {verificationLink.trim() && (
              <button
                type="button"
                onClick={handleVerify}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    {provider ? 'Verifying...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <span>🔗</span>
                    {provider ? `Verify with ${provider === 'github' ? 'GitHub' : 'Strava'}` : 'Save with Link'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-border bg-accent/5 flex gap-3">
          <button 
            onClick={handleDelete}
            disabled={deleting || saving}
            className="px-6 py-3.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl font-black text-sm uppercase tracking-[0.1em] hover:bg-red-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
            Delete
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || deleting}
            className="flex-1 py-3.5 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EditSkillModal;
