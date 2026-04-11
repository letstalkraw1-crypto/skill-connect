import React, { useState, useEffect } from 'react';
import { Trophy, Star, Clock, ChevronRight, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import api from '../services/api';

const difficultyColor = (d) => {
  if (!d) return 'bg-accent text-muted-foreground';
  const l = d.toLowerCase();
  if (l === 'easy') return 'bg-emerald-500/20 text-emerald-400';
  if (l === 'medium') return 'bg-amber-500/20 text-amber-400';
  if (l === 'hard') return 'bg-red-500/20 text-red-400';
  return 'bg-accent text-muted-foreground';
};

const SubmitModal = ({ challenge, onClose, onSuccess }) => {
  const [submissionData, setSubmissionData] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submissionData.trim()) { setError('Please describe your submission'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post(`/challenges/${challenge._id}/submit`, { submissionData });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md glass-card rounded-3xl border border-border shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg">Submit Challenge</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-5 font-medium">{challenge.title}</p>
        {error && <div className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Your Submission *</label>
            <textarea rows={4} placeholder="Describe what you did, share a link, or explain your approach..."
              value={submissionData} onChange={e => setSubmissionData(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const LeaderboardModal = ({ challenge, onClose }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/challenges/${challenge._id}/submissions`)
      .then(({ data }) => setSubmissions(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [challenge._id]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-md glass-card rounded-3xl border border-border shadow-2xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg">Leaderboard</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground animate-pulse text-sm">Loading...</div>
        ) : submissions.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">No submissions yet</div>
        ) : (
          <div className="space-y-3">
            {submissions.map((s, i) => (
              <div key={s._id || i} className="flex items-center gap-3 p-3 bg-accent/30 rounded-xl">
                <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-black text-sm ${i === 0 ? 'bg-amber-500/20 text-amber-400' : i === 1 ? 'bg-slate-400/20 text-slate-400' : i === 2 ? 'bg-orange-600/20 text-orange-500' : 'bg-accent text-muted-foreground'}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{s.userId?.name || 'Anonymous'}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.submissionData}</p>
                </div>
                {s.score != null && (
                  <span className="text-xs font-bold text-primary">{s.score}pts</span>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default function Challenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitChallenge, setSubmitChallenge] = useState(null);
  const [leaderboardChallenge, setLeaderboardChallenge] = useState(null);
  const [submitted, setSubmitted] = useState(new Set());

  useEffect(() => {
    api.get('/challenges')
      .then(({ data }) => setChallenges(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isActive = (c) => {
    const now = new Date();
    const start = c.startDate ? new Date(c.startDate) : null;
    const end = c.endDate ? new Date(c.endDate) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Trophy size={24} className="text-primary" />
        <h1 className="text-2xl font-black tracking-tight">Challenges</h1>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="glass-card p-5 rounded-2xl animate-pulse h-40" />)}
        </div>
      ) : challenges.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
          <Trophy size={48} className="opacity-20" />
          <p className="font-bold">No challenges yet</p>
          <p className="text-sm">Check back soon for new skill challenges</p>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge, idx) => {
            const active = isActive(challenge);
            const hasSubmitted = submitted.has(challenge._id);
            return (
              <motion.div key={challenge._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="glass-card rounded-2xl border border-border p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-black text-base">{challenge.title}</h3>
                      {!active && (
                        <span className="px-2 py-0.5 bg-accent text-muted-foreground text-[10px] font-bold rounded-full uppercase tracking-wider">Ended</span>
                      )}
                    </div>
                    {challenge.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded-full">
                      <Star size={12} />
                      <span className="text-xs font-black">{challenge.points || 10} pts</span>
                    </div>
                    {challenge.difficulty && (
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${difficultyColor(challenge.difficulty)}`}>
                        {challenge.difficulty}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-4">
                  {challenge.skillId?.name && (
                    <span className="px-2 py-1 bg-accent/50 rounded-lg font-bold">{challenge.skillId.name}</span>
                  )}
                  {challenge.startDate && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {format(new Date(challenge.startDate), 'MMM d')} — {challenge.endDate ? format(new Date(challenge.endDate), 'MMM d, yyyy') : 'Ongoing'}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  {active && !hasSubmitted && (
                    <button onClick={() => setSubmitChallenge(challenge)}
                      className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                      Submit Entry
                    </button>
                  )}
                  {hasSubmitted && (
                    <div className="flex-1 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold text-center">
                      ✓ Submitted
                    </div>
                  )}
                  <button onClick={() => setLeaderboardChallenge(challenge)}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-accent border border-border rounded-xl text-sm font-bold hover:bg-accent/80 transition-all">
                    <Trophy size={14} />
                    <span className="hidden sm:inline">Leaderboard</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {submitChallenge && (
          <SubmitModal challenge={submitChallenge} onClose={() => setSubmitChallenge(null)}
            onSuccess={() => {
              setSubmitted(prev => new Set([...prev, submitChallenge._id]));
              setSubmitChallenge(null);
            }} />
        )}
        {leaderboardChallenge && (
          <LeaderboardModal challenge={leaderboardChallenge} onClose={() => setLeaderboardChallenge(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
