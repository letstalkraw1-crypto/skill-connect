import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Star, Loader2, Check } from 'lucide-react';
import { userService } from '../services/api';

const AddSkillModal = ({ onClose, onSave }) => {
  const [skillsData, setSkillsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubSkill, setSelectedSubSkill] = useState(null);
  const [proficiency, setProficiency] = useState('Beginner');
  const [saving, setSaving] = useState(false);

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
    setSaving(true);
    try {
      const skills = [{
        name: selectedCategory,
        subSkill: selectedSubSkill,
        proficiency: proficiency
      }];
      await onSave(skills);
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add skill');
    } finally {
      setSaving(false);
    }
  };

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
