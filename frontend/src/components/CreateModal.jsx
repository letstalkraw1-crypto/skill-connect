import React, { useState } from 'react';
import { X, Calendar, Users, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

export default function CreateModal({ onClose }) {
  const [tab, setTab] = useState('event'); // 'event' | 'community'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Event fields
  const [eventForm, setEventForm] = useState({
    title: '', datetime: '', venueName: '', guidelines: ''
  });

  // Community fields
  const [communityForm, setCommunityForm] = useState({
    name: '', description: '', type: 'community', maxMembers: 100
  });

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.datetime) {
      setError('Title and date/time are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/events', eventForm);
      onClose(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCommunity = async (e) => {
    e.preventDefault();
    if (!communityForm.name) {
      setError('Community name is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/communities', communityForm);
      onClose(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose(false)}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="w-full max-w-md glass-card rounded-3xl p-6 border border-border shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black tracking-tight">Create New</h2>
          <button onClick={() => onClose(false)} className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-accent transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-2 p-1 bg-accent/30 rounded-2xl mb-6">
          <button
            onClick={() => { setTab('event'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'event' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Calendar size={16} /> Event
          </button>
          <button
            onClick={() => { setTab('community'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'community' ? 'bg-primary text-primary-foreground shadow-lg' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Users size={16} /> Community
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive font-medium">
            {error}
          </div>
        )}

        {/* Event Form */}
        {tab === 'event' && (
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Event Title *</label>
              <input
                type="text"
                placeholder="e.g. Morning Run at Cubbon Park"
                value={eventForm.title}
                onChange={e => setEventForm(p => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Date & Time *</label>
              <input
                type="datetime-local"
                value={eventForm.datetime}
                onChange={e => setEventForm(p => ({ ...p, datetime: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Venue / Location</label>
              <input
                type="text"
                placeholder="e.g. Cubbon Park, Bangalore"
                value={eventForm.venueName}
                onChange={e => setEventForm(p => ({ ...p, venueName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Guidelines / Description</label>
              <textarea
                rows={3}
                placeholder="What should participants know?"
                value={eventForm.guidelines}
                onChange={e => setEventForm(p => ({ ...p, guidelines: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Entry Fee (₹) — leave 0 for free</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={eventForm.entryFee || ''}
                onChange={e => setEventForm(p => ({ ...p, entryFee: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
          </form>
        )}

        {/* Community Form */}
        {tab === 'community' && (
          <form onSubmit={handleCreateCommunity} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Community Name *</label>
              <input
                type="text"
                placeholder="e.g. Bangalore Runners Club"
                value={communityForm.name}
                onChange={e => setCommunityForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Description</label>
              <textarea
                rows={3}
                placeholder="What is this community about?"
                value={communityForm.description}
                onChange={e => setCommunityForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Type</label>
                <select
                  value={communityForm.type}
                  onChange={e => setCommunityForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                >
                  <option value="community">Community</option>
                  <option value="group">Group</option>
                  <option value="team">Team</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Max Members</label>
                <input
                  type="number"
                  min={2}
                  max={10000}
                  value={communityForm.maxMembers}
                  onChange={e => setCommunityForm(p => ({ ...p, maxMembers: parseInt(e.target.value) || 100 }))}
                  className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Community'}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
