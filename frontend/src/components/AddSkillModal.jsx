import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Star, Loader2, Check, Gamepad2, Upload } from 'lucide-react';
import { userService } from '../services/api';
import api from '../services/api';

const PRESET_GAMES = ['BGMI', 'Free Fire', 'Valorant', 'COD Mobile', 'Chess'];
const GAMING_ROLES = ['Fragger', 'Sniper', 'Support', 'IGL (In-Game Leader)', 'All-rounder'];

const AddSkillModal = ({ onClose, onSave }) => {
  const [skillsData, setSkillsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubSkill, setSelectedSubSkill] = useState(null);
  const [proficiency, setProficiency] = useState('Beginner');
  const [yearsExp, setYearsExp] = useState(0);
  const [verificationLink, setVerificationLink] = useState('');
  const [certificateFile, setCertificateFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // Gaming-specific state
  const [selectedGame, setSelectedGame] = useState('');
  const [customGame, setCustomGame] = useState('');
  const [playerId, setPlayerId] = useState('');
  const [gamingRole, setGamingRole] = useState('');
  const [screenshotFile, setScreenshotFile] = useState(null);

  const isGaming = false; // Online Gaming skill removed

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const { data } = await userService.getSkillsList();
        setSkillsData(data);
      } catch (err) {
        console.error('Failed to load skills:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSkills();
  }, []);

  const handleSave = async () => {
    if (!selectedCategory) return;

    // Validate required gaming fields
    if (isGaming) {
      const gameName = selectedGame === 'Other' ? customGame.trim() : selectedGame;
      if (!gameName) {
        alert('Please select or enter a game name');
        return;
      }
      if (!playerId.trim()) {
        alert('Player ID / UID is required for Online Gaming');
        return;
      }
      if (!screenshotFile) {
        alert('Please upload a rank screenshot for verification');
        return;
      }
    }

    setSaving(true);
    try {
      const skills = [{
        name: selectedCategory,
        subSkill: isGaming ? (selectedGame === 'Other' ? customGame : selectedGame) || selectedSubSkill : selectedSubSkill,
        proficiency: proficiency,
        yearsExp: parseInt(yearsExp) || 0,
        verificationLink: verificationLink.trim() || null,
      }];
      
      await onSave(skills);

      // Gaming verification — upload screenshot + submit verification
      if (isGaming && screenshotFile) {
        try {
          const token = localStorage.getItem('token');
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload.userId;

          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: profile } = await userService.getProfile(userId);
          const savedSkill = profile.skills?.find(s => s.name.toLowerCase() === 'online gaming');

          if (savedSkill) {
            const formData = new FormData();
            formData.append('certificate', screenshotFile);
            formData.append('skillName', 'Online Gaming');
            formData.append('verificationType', 'gaming');
            formData.append('gamingDetails', JSON.stringify({
              game: selectedGame === 'Other' ? customGame : selectedGame,
              customGame: selectedGame === 'Other' ? customGame : '',
              playerId,
              role: gamingRole,
            }));
            await api.post('/profile/verifications', formData);
          }
        } catch (e) {
          console.error('Gaming verification submission failed:', e);
        }
      }

      // OAuth verification for non-gaming skills
      if (!isGaming && verificationLink.trim()) {
        const provider = getOAuthProvider(selectedCategory, verificationLink);
        if (provider) {
          const token = localStorage.getItem('token');
          if (!token) { alert('Please log in to verify skills'); onClose(); return; }
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userId = payload.userId;
            await new Promise(resolve => setTimeout(resolve, 500));
            const { data: profile } = await userService.getProfile(userId);
            const savedSkill = profile.skills?.find(s => s.name.toLowerCase() === selectedCategory.toLowerCase());
            if (savedSkill) {
              const skillId = savedSkill.userSkillId || savedSkill._id || savedSkill.id;
              window.location.href = `/api/auth/oauth/${provider}?skillId=${skillId}&skillName=${encodeURIComponent(selectedCategory)}`;
              return;
            } else {
              alert('Skill saved but verification failed. Please try again from your profile.');
            }
          } catch (err) {
            console.error('Failed to parse token or fetch profile:', err);
            alert('Skill saved but verification failed. Please try again from your profile.');
          }
        }
      }

      if (!isGaming && certificateFile) {
        try {
          const formData = new FormData();
          formData.append('certificate', certificateFile);
          formData.append('skillName', selectedCategory);
          formData.append('verificationType', 'certificate');
          await api.post('/profile/verifications', formData);
        } catch (e) {
          console.error('Verification submission failed:', e);
        }
      }

      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add skill');
    } finally {
      setSaving(false);
    }
  };

  // Determine OAuth provider based on skill and URL
  const getOAuthProvider = (skill, url) => {
    const s = skill.toLowerCase();
    
    // Strava for fitness/sports skills
    if (s.includes('running') || s.includes('cycling') || s.includes('swimming')) {
      return 'strava';
    }
    
    // GitHub for coding skills
    if (s.includes('coding') || s.includes('programming')) {
      if (url.includes('github.com') || !url) {
        return 'github';
      }
    }
    
    return null; // No OAuth provider for this skill
  };

  // What verification is expected for this skill
  const getVerificationHint = (skill) => {
    if (!skill) return null;
    const s = skill.toLowerCase();
    
    // Strava skills - OAuth configured
    if (s.includes('running') || s.includes('cycling') || s.includes('swimming')) {
      return { label: 'Strava Profile Link', placeholder: 'https://www.strava.com/athletes/...' };
    }
    
    // GitHub skills - OAuth configured
    if (s.includes('coding') || s.includes('programming')) {
      return { label: 'GitHub Profile Link', placeholder: 'https://github.com/username' };
    }
    
    return { label: 'Certificate or Portfolio Link', placeholder: 'https://...' };
  };

  const verificationHint = getVerificationHint(selectedCategory);

  const filteredCategories = Object.keys(skillsData).filter(cat => 
    cat.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-background border border-border w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-accent/10">
          <div>
            <h2 className="text-xl font-black tracking-tight text-primary">Add New Skill</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1">Level up your profile</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!selectedCategory ? (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
                <input 
                  type="text" 
                  placeholder="Search skills (e.g. Coding, Running...)" 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-accent/20 border border-border outline-none focus:ring-2 focus:ring-primary/50"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredCategories.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className="p-4 rounded-2xl bg-accent/10 border border-border hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <p className="text-sm font-bold group-hover:text-primary transition-colors">{cat}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => { setSelectedCategory(null); setSelectedSubSkill(null); }}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 mb-2"
              >
                ← Back to all skills
              </button>

              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Selected Skill</p>
                  <h3 className="text-lg font-bold">{selectedCategory}</h3>
                </div>
                <Check className="text-primary" />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Specialization (Optional)</label>
                <div className="flex flex-wrap gap-2">
                  {skillsData[selectedCategory].map(sub => (
                    <button 
                      key={sub}
                      onClick={() => setSelectedSubSkill(selectedSubSkill === sub ? null : sub)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        selectedSubSkill === sub ? 'bg-primary text-primary-foreground border-primary' : 'bg-accent/10 border-border hover:border-primary/50'
                      }`}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gaming-specific form */}
              {isGaming && (
                <div className="space-y-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <Gamepad2 size={16} className="text-primary" />
                    <span className="text-xs font-black uppercase text-primary tracking-widest">Gaming Details</span>
                  </div>

                  {/* Game selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Select Game *</label>
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
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">In-Game Player ID / UID *</label>
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
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Rank Screenshot *</label>
                    <p className="text-xs text-muted-foreground">Upload a screenshot of your in-game rank/profile for verification</p>
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
                    {screenshotFile && (
                      <p className="text-xs text-amber-500 font-bold">⏳ Will be reviewed by admin within 24 hours</p>
                    )}
                  </div>
                </div>
              )}

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

              {/* Verification */}
              {verificationHint && (
                <div className="space-y-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-primary tracking-widest">Verification (Optional)</span>
                    <span className="px-2 py-0.5 bg-primary/20 text-primary text-[9px] font-bold rounded-full uppercase">Get Badge</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Add a Certificate or Portfolio Link to get a verified badge on this skill.</p>
                  
                  {/* Link Input with Verify Button */}
                  <div className="space-y-2">
                    <input
                      type="url"
                      placeholder={verificationHint.placeholder}
                      value={verificationLink}
                      onChange={(e) => setVerificationLink(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-accent/20 border border-border outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                    />
                    
                    {/* Verify Button - Show for any link entered */}
                    {verificationLink.trim() && (
                      <button
                        type="button"
                        onClick={async () => {
                          const provider = getOAuthProvider(selectedCategory, verificationLink);
                          
                          // If OAuth provider is available, use OAuth flow
                          if (provider) {
                            // Save skill first, then redirect to OAuth
                            setSaving(true);
                            try {
                              const skills = [{
                                name: selectedCategory,
                                subSkill: selectedSubSkill,
                                proficiency: proficiency,
                                yearsExp: parseInt(yearsExp) || 0,
                                verificationLink: verificationLink.trim(),
                              }];
                              
                              await onSave(skills);

                              // Get user ID and redirect to OAuth
                              const token = localStorage.getItem('token');
                              if (!token) {
                                alert('Please log in to verify skills');
                                setSaving(false);
                                return;
                              }

                              const payload = JSON.parse(atob(token.split('.')[1]));
                              const userId = payload.userId;
                              
                              // Wait for skill to be saved
                              await new Promise(resolve => setTimeout(resolve, 500));
                              
                              // Fetch profile to get skill ID
                              const { data: profile } = await userService.getProfile(userId);
                              const savedSkill = profile.skills?.find(s => 
                                s.name.toLowerCase() === selectedCategory.toLowerCase()
                              );
                              
                              if (savedSkill) {
                                const skillId = savedSkill.userSkillId || savedSkill._id || savedSkill.id;
                                window.location.href = `/api/auth/oauth/${provider}?skillId=${skillId}&skillName=${encodeURIComponent(selectedCategory)}`;
                              } else {
                                alert('Skill saved but verification failed. Please try again from your profile.');
                                setSaving(false);
                              }
                            } catch (err) {
                              console.error('Verification error:', err);
                              alert('Failed to start verification. Please try again.');
                              setSaving(false);
                            }
                          } else {
                            // For non-OAuth links (portfolio, certificates, etc.), just save with the link
                            setSaving(true);
                            try {
                              const skills = [{
                                name: selectedCategory,
                                subSkill: selectedSubSkill,
                                proficiency: proficiency,
                                yearsExp: parseInt(yearsExp) || 0,
                                verificationLink: verificationLink.trim(),
                              }];
                              
                              await onSave(skills);
                              alert('✅ Skill saved with verification link!');
                              onClose();
                            } catch (err) {
                              console.error('Save error:', err);
                              alert('Failed to save skill. Please try again.');
                            } finally {
                              setSaving(false);
                            }
                          }
                        }}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="animate-spin" size={18} />
                            {getOAuthProvider(selectedCategory, verificationLink) ? 'Verifying...' : 'Saving...'}
                          </>
                        ) : (
                          <>
                            <span>🔗</span>
                            {getOAuthProvider(selectedCategory, verificationLink) 
                              ? `Verify with ${getOAuthProvider(selectedCategory, verificationLink) === 'github' ? 'GitHub' : 'Strava'}`
                              : 'Save with Link'}
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {selectedCategory && !selectedCategory.toLowerCase().includes('running') && !selectedCategory.toLowerCase().includes('cycling') && !selectedCategory.toLowerCase().includes('coding') && (
                    <div className="pt-3 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-2">Or upload a certificate:</p>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/30 border border-border cursor-pointer hover:border-primary/50 transition-all text-sm">
                        <span className="text-primary">📎</span>
                        <span className="text-muted-foreground">{certificateFile ? certificateFile.name : 'Choose certificate file'}</span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                          onChange={e => setCertificateFile(e.target.files[0])} />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-accent/5">
          <button 
            onClick={handleSave}
            disabled={!selectedCategory || saving}
            className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-[0.1em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="animate-spin" size={18} /> : 'Save Skill to Profile'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AddSkillModal;
