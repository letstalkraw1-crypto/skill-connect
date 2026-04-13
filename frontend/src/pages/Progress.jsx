import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic2, Trophy, Flame, Calendar, TrendingUp, Play, ArrowRight } from 'lucide-react';
import api from '../services/api';

const CHALLENGE_LABELS = { starter: 'Starter Pack', builder: 'Builder Pack', pro: 'Pro Pack' };

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myVideos, setMyVideos] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/user-challenges/progress'),
      api.get('/daily-challenge/my-submissions'),
    ]).then(([progressRes, videosRes]) => {
      setProgress(progressRes.data);
      setMyVideos(videosRes.data);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pb-24 pt-4 space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="glass-card p-6 rounded-2xl animate-pulse h-24" />)}
      </div>
    );
  }

  const p = progress || {};
  const challenge = p.activeChallenge;
  const challengePercent = challenge ? Math.round((challenge.videosCompleted / challenge.targetVideos) * 100) : 0;
  const daysLeft = challenge ? Math.max(0, Math.ceil((new Date(challenge.expiresAt) - Date.now()) / 86400000)) : 0;

  return (
    <div className="max-w-2xl mx-auto pb-24 pt-4 space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp size={24} className="text-primary" />
        <h1 className="text-2xl font-black tracking-tight">My Progress</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-4 rounded-2xl text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Flame size={16} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400">{p.streakCount || 0}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Streak</p>
        </div>
        <div className="glass-card p-4 rounded-2xl text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Mic2 size={16} className="text-primary" />
          </div>
          <p className="text-2xl font-black text-primary">{p.totalVideos || 0}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Videos</p>
        </div>
        <div className="glass-card p-4 rounded-2xl text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Calendar size={16} className="text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{p.activeDays || 0}</p>
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Active Days</p>
        </div>
      </div>

      {/* Active challenge */}
      {challenge ? (
        <div className="glass-card p-6 rounded-2xl border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Active Challenge</p>
              <h3 className="font-black text-lg">{CHALLENGE_LABELS[challenge.type]}</h3>
            </div>
            <span className="text-xs text-muted-foreground">{daysLeft} days left</span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{challenge.videosCompleted} of {challenge.targetVideos} videos</span>
              <span>{challengePercent}%</span>
            </div>
            <div className="h-3 bg-accent rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${challengePercent}%` }} transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-primary rounded-full" />
            </div>
          </div>
          <button onClick={() => navigate('/daily-challenge')}
            className="w-full py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-bold hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-2">
            <Mic2 size={16} /> Submit Today's Video
          </button>
        </div>
      ) : (
        <div className="glass-card p-6 rounded-2xl text-center space-y-3">
          <Trophy size={32} className="text-muted-foreground/30 mx-auto" />
          <p className="font-bold">No active challenge</p>
          <p className="text-sm text-muted-foreground">Start a new challenge to track your progress</p>
          <StartChallengeButtons onStarted={() => window.location.reload()} />
        </div>
      )}

      {/* Badges */}
      {p.badges?.length > 0 && (
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="font-black mb-4">Badges Earned</h3>
          <div className="flex flex-wrap gap-3">
            {p.badges.map(badge => (
              <div key={badge.id} className="flex flex-col items-center gap-1 p-3 bg-accent/30 rounded-xl min-w-[72px]">
                <span className="text-2xl">{badge.emoji}</span>
                <span className="text-[10px] font-bold text-center leading-tight">{badge.label}</span>
              </div>
            ))}
          </div>
          {/* Next badge hint */}
          {p.totalVideos < 30 && (
            <p className="text-xs text-muted-foreground mt-3">
              {p.totalVideos < 3 ? `${3 - p.totalVideos} more videos to unlock 🔥 Getting Warm` :
               p.totalVideos < 5 ? `${5 - p.totalVideos} more videos to unlock ⚡ Building Momentum` :
               p.totalVideos < 10 ? `${10 - p.totalVideos} more videos to unlock 🏆 Consistent Speaker` :
               p.totalVideos < 20 ? `${20 - p.totalVideos} more videos to unlock 🎯 Communication Pro` :
               `${30 - p.totalVideos} more videos to unlock 🌟 Collabro Champion`}
            </p>
          )}
        </div>
      )}

      {/* Past submissions */}
      {myVideos.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-black">My Submissions</h3>
          {myVideos.map(video => (
            <div key={video._id} className="glass-card p-4 rounded-2xl flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-black flex items-center justify-center flex-shrink-0">
                <Play size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{video.challenge?.topic || 'Challenge'}</p>
                <p className="text-xs text-muted-foreground">{new Date(video.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="text-xs text-muted-foreground">{video.feedbackCount || 0} feedback</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Inline component for starting a new challenge
function StartChallengeButtons({ onStarted }) {
  const [loading, setLoading] = useState(null);

  const start = async (type) => {
    setLoading(type);
    try {
      await api.post('/user-challenges/start', { type });
      onStarted();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to start challenge');
    } finally { setLoading(null); }
  };

  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {[
        { id: 'starter', label: '🟢 Starter (3 videos)' },
        { id: 'builder', label: '🟡 Builder (5 videos)' },
        { id: 'pro', label: '🔴 Pro (7 videos)' },
      ].map(pack => (
        <button key={pack.id} onClick={() => start(pack.id)} disabled={!!loading}
          className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50">
          {loading === pack.id ? '...' : pack.label}
        </button>
      ))}
    </div>
  );
}
