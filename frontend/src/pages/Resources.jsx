import React, { useState, useEffect } from 'react';
import { BookOpen, Link as LinkIcon, Heart, ExternalLink, X, Plus, Loader2, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const RESOURCE_TYPES = ['article', 'video', 'course', 'book', 'tool', 'other'];

const typeColor = (t) => {
  const map = {
    article: 'bg-blue-500/20 text-blue-400',
    video: 'bg-red-500/20 text-red-400',
    course: 'bg-purple-500/20 text-purple-400',
    book: 'bg-amber-500/20 text-amber-400',
    tool: 'bg-emerald-500/20 text-emerald-400',
    other: 'bg-accent text-muted-foreground',
  };
  return map[t?.toLowerCase()] || map.other;
};

const AddResourceModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ title: '', description: '', type: 'article', url: '', category: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.type) { setError('Title and type are required'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/resources', form);
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to add resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md glass-card rounded-3xl border border-border shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg">Share Resource</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>
        {error && <div className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Title *</label>
            <input type="text" placeholder="e.g. The Complete React Guide"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Type *</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm">
              {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">URL</label>
            <input type="url" placeholder="https://..."
              value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Category</label>
            <input type="text" placeholder="e.g. Web Development, Running, Design"
              value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Description</label>
            <textarea rows={3} placeholder="What will people learn from this?"
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {loading ? 'Sharing...' : 'Share Resource'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default function Resources() {
  const { user } = useAuth();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [filterType, setFilterType] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const fetchResources = async () => {
    try {
      const params = filterType !== 'all' ? { type: filterType } : {};
      const { data } = await api.get('/resources', { params });
      setResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, [filterType]);

  const handleFavorite = async (resource) => {
    const id = resource._id;
    const isFav = favorites.has(id);
    try {
      if (isFav) {
        await api.delete(`/resources/${id}/favorite`);
        setFavorites(prev => { const s = new Set(prev); s.delete(id); return s; });
      } else {
        await api.post(`/resources/${id}/favorite`);
        setFavorites(prev => new Set([...prev, id]));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = filterType === 'all' ? resources : resources.filter(r => r.type === filterType);

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-primary" />
          <h1 className="text-2xl font-black tracking-tight">Resources</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowFilters(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${showFilters || filterType !== 'all' ? 'bg-primary/10 text-primary' : 'bg-accent text-muted-foreground hover:text-foreground'}`}>
              <Filter size={14} />
              {filterType === 'all' ? 'Filter' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-full mt-2 w-40 glass-card rounded-xl border border-border shadow-xl z-20 p-1">
                  {['all', ...RESOURCE_TYPES].map(t => (
                    <button key={t} onClick={() => { setFilterType(t); setShowFilters(false); }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === t ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
            <Plus size={16} /> Share
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="glass-card p-5 rounded-2xl animate-pulse h-32" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
          <BookOpen size={48} className="opacity-20" />
          <p className="font-bold">No resources yet</p>
          <p className="text-sm">Be the first to share a learning resource</p>
          <button onClick={() => setShowAdd(true)}
            className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">
            Share Resource
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((resource, idx) => (
            <motion.div key={resource._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
              className="glass-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-black text-base group-hover:text-primary transition-colors">{resource.title}</h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${typeColor(resource.type)}`}>
                      {resource.type}
                    </span>
                  </div>
                  {resource.category && (
                    <p className="text-xs text-primary font-bold mb-1">{resource.category}</p>
                  )}
                  {resource.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{resource.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-widest">
                    Shared by {resource.userId?.name || 'Anonymous'}
                  </p>
                </div>
                <button onClick={() => handleFavorite(resource)}
                  className={`flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-xl transition-all ${favorites.has(resource._id) ? 'bg-red-500/20 text-red-400' : 'bg-accent text-muted-foreground hover:text-red-400'}`}>
                  <Heart size={16} className={favorites.has(resource._id) ? 'fill-current' : ''} />
                </button>
              </div>
              {resource.url && (
                <a href={resource.url} target="_blank" rel="noopener noreferrer"
                  className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-accent/50 hover:bg-primary hover:text-primary-foreground rounded-xl text-sm font-bold transition-all group/link">
                  <LinkIcon size={14} />
                  <span className="flex-1 truncate text-xs">{resource.url}</span>
                  <ExternalLink size={12} className="flex-shrink-0 opacity-60 group-hover/link:opacity-100" />
                </a>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <AddResourceModal onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchResources(); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
