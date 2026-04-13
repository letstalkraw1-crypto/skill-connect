import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mic2, ArrowRight, Flame, Clock } from 'lucide-react';
import api from '../services/api';

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [challengeLoading, setChallengeLoading] = useState(true);

  useEffect(() => {
    api.get('/daily-challenge/today')
      .then(({ data }) => setChallenge(data))
      .catch(() => {})
      .finally(() => setChallengeLoading(false));
  }, []);

  return (
    <div className="max-w-2xl mx-auto pb-24 pt-4 space-y-6">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Ready to practice today?</p>
        </div>
        {user?.streakCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 text-amber-400 rounded-xl">
            <Flame size={16} />
            <span className="text-sm font-black">{user.streakCount} day streak</span>
          </div>
        )}
      </div>

      {/* Today's Challenge Card */}
      {challengeLoading ? (
        <div className="glass-card p-6 rounded-2xl animate-pulse h-36" />
      ) : challenge ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-2xl border border-primary/30 bg-primary/5 cursor-pointer hover:border-primary/60 transition-all group"
          onClick={() => navigate('/daily-challenge')}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/20 text-primary text-xs font-black rounded-full uppercase tracking-wider">
                  <Mic2 size={12} /> Today's Challenge
                </span>
                {challenge.dueTime && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground font-bold">
                    <Clock size={12} /> Due {challenge.dueTime}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black group-hover:text-primary transition-colors">{challenge.topic}</h2>
              {challenge.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{challenge.description}</p>
              )}
            </div>
            <div className="flex-shrink-0">
              {challenge.hasSubmitted ? (
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl">✓ Done</span>
              ) : (
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <ArrowRight size={18} className="text-primary group-hover:text-primary-foreground" />
                </div>
              )}
            </div>
          </div>

          {!challenge.hasSubmitted && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <button
                onClick={e => { e.stopPropagation(); navigate('/daily-challenge'); }}
                className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                <Mic2 size={16} /> Submit Your Response
              </button>
            </div>
          )}
        </motion.div>
      ) : (
        <div className="glass-card p-6 rounded-2xl border border-border text-center">
          <Mic2 size={32} className="text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No challenge posted today yet</p>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-4 rounded-2xl text-center">
          <p className="text-2xl font-black text-primary">{user?.streakCount || 0}</p>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">Day Streak</p>
        </div>
        <div className="glass-card p-4 rounded-2xl text-center cursor-pointer hover:border-primary/30 transition-all"
          onClick={() => navigate('/daily-challenge')}>
          <p className="text-2xl font-black text-primary">→</p>
          <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest mt-1">View Feed</p>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground pt-4">
        <p>© 2026 Collabro. All rights reserved.</p>
        <div className="flex justify-center gap-3 mt-1">
          <a href="/legal/privacy" className="hover:text-primary">Privacy</a>
          <a href="/legal/terms" className="hover:text-primary">Terms</a>
        </div>
      </div>
    </div>
  );
};

export default Home;
