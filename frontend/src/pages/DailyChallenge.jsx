import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Video, Upload, Send, ThumbsUp, ArrowRight, Loader2, X, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../components/Avatar';
import api from '../services/api';

// ─── Feedback Modal ───────────────────────────────────────────────────────────
const FeedbackModal = ({ video, onClose, onSubmitted }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/daily-challenge/feedback/${video._id}`, { positive: text, improvement: text });
      onSubmitted();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to submit';
      if (err?.response?.status === 409) {
        // Already gave feedback — treat as success, close modal
        onSubmitted();
        onClose();
        return;
      }
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/80" onClick={e => e.target === e.currentTarget && onClose()}>
      {/* Tappable backdrop */}
      <div className="flex-1" onClick={onClose} />

      {/* Sheet — keyboard pushes this up automatically */}
      <div className="bg-background border-t border-border w-full" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <span className="text-sm font-black">Feedback for {video.user?.name}</span>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg bg-accent"><X size={14} /></button>
        </div>

        {error && <p className="px-4 pt-2 text-xs text-destructive">{error}</p>}

        <div className="flex items-end gap-2 px-3 py-3">
          <Avatar src={video.user?.avatarUrl} name={video.user?.name} size="8" />
          <div className="flex-1 flex items-end gap-2 bg-accent/30 border border-border rounded-2xl px-3 py-2">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="Write your feedback..."
              value={text}
              onChange={e => {
                setText(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              className="flex-1 bg-transparent outline-none text-sm resize-none leading-5 max-h-[120px] overflow-y-auto"
              style={{ height: '24px' }}
            />
            <button onClick={handleSubmit} disabled={!text.trim() || loading}
              className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-90 transition-all">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Feedback Item (with long-press actions) ──────────────────────────────────
const FeedbackItem = ({ feedback: f, currentUserId, isVideoOwner, onDeleted, onReplied }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pressTimer = useRef(null);

  const canDelete = f.reviewerId === currentUserId || isVideoOwner;
  const canReply = isVideoOwner && !f.ownerReply;

  const startPress = () => { pressTimer.current = setTimeout(() => setShowMenu(true), 500); };
  const endPress = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };

  const handleDelete = async () => {
    setShowMenu(false);
    try {
      await api.delete(`/daily-challenge/feedback/${f._id}`);
      onDeleted();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to delete');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await api.post(`/daily-challenge/feedback/${f._id}/reply`, { reply: replyText.trim() });
      onReplied(replyText.trim());
      setReplyText('');
      setShowReplyInput(false);
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to reply');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {showMenu && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setShowMenu(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="absolute right-0 top-0 z-[70] bg-background border border-border rounded-2xl shadow-2xl py-1 min-w-[140px]">
            {canReply && (
              <button onClick={() => { setShowMenu(false); setShowReplyInput(true); }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-accent transition-colors">
                💬 Reply
              </button>
            )}
            {canDelete && (
              <button onClick={handleDelete}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors">
                🗑 Delete
              </button>
            )}
          </motion.div>
        </>
      )}

      <div
        className="p-3 bg-accent/30 rounded-xl space-y-2 select-none"
        onMouseDown={startPress} onMouseUp={endPress} onMouseLeave={endPress}
        onTouchStart={startPress} onTouchEnd={endPress}
        onContextMenu={e => { e.preventDefault(); if (canDelete || canReply) setShowMenu(true); }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar src={f.reviewer?.avatarUrl} name={f.reviewer?.name} size="8" />
            <p className="text-xs font-bold">{f.reviewer?.name || 'Anonymous'}</p>
          </div>
          {(canDelete || canReply) && (
            <p className="text-[10px] text-muted-foreground">hold to act</p>
          )}
        </div>
        <p className="text-xs">{f.positive}</p>

        {/* Owner reply */}
        {f.ownerReply && (
          <div className="ml-4 pl-3 border-l-2 border-primary/30 mt-2">
            <p className="text-[10px] text-primary font-bold mb-0.5">Owner replied:</p>
            <p className="text-xs text-muted-foreground">{f.ownerReply}</p>
          </div>
        )}
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            type="text"
            placeholder="Write your reply..."
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleReply(); if (e.key === 'Escape') setShowReplyInput(false); }}
            className="flex-1 px-3 py-2 rounded-xl bg-accent/30 border border-border outline-none text-xs"
          />
          <button onClick={handleReply} disabled={!replyText.trim() || submitting}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold disabled:opacity-40">
            {submitting ? '...' : 'Send'}
          </button>
          <button onClick={() => setShowReplyInput(false)} className="px-3 py-2 bg-accent rounded-xl text-xs">✕</button>
        </div>
      )}
    </div>
  );
};

// ─── Radar Chart (pure SVG, no library needed) ───────────────────────────────
const RadarChart = ({ scores }) => {
  if (!scores) return null;
  const dims = ['confidence', 'clarity', 'structure', 'relevance', 'overall'];
  const labels = ['Confidence', 'Clarity', 'Structure', 'Relevance', 'Overall'];
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const levels = 5;

  const angleStep = (2 * Math.PI) / dims.length;
  const getPoint = (i, val, maxVal = 10) => {
    const angle = i * angleStep - Math.PI / 2;
    const dist = (val / maxVal) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const gridPoints = (level) =>
    dims.map((_, i) => getPoint(i, (level / levels) * 10)).map(p => `${p.x},${p.y}`).join(' ');

  const dataPoints = dims.map((d, i) => getPoint(i, scores[d] || 0)).map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* Grid */}
      {Array.from({ length: levels }, (_, i) => (
        <polygon key={i} points={gridPoints(i + 1)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
      ))}
      {/* Axes */}
      {dims.map((_, i) => {
        const p = getPoint(i, 10);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />;
      })}
      {/* Data */}
      <polygon points={dataPoints} fill="rgba(139,92,246,0.25)" stroke="#8b5cf6" strokeWidth="2" />
      {/* Dots */}
      {dims.map((d, i) => {
        const p = getPoint(i, scores[d] || 0);
        return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#8b5cf6" />;
      })}
      {/* Labels */}
      {dims.map((d, i) => {
        const p = getPoint(i, 12.5);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            fontSize="8" fill="rgba(255,255,255,0.6)" fontWeight="bold">
            {labels[i].slice(0, 3)}
          </text>
        );
      })}
    </svg>
  );
};

// ─── Transcript Viewer ────────────────────────────────────────────────────────
const TranscriptViewer = ({ videoUrl, transcript, onClose }) => {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Split transcript into words with rough timing
  const words = transcript ? transcript.split(' ') : [];
  const totalWords = words.length;

  return (
    <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <h3 className="font-black text-white text-sm">Video + Transcript</h3>
        <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl bg-white/10 text-white"><X size={16} /></button>
      </div>
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Video */}
        <div className="md:w-1/2 bg-black flex items-center">
          <video ref={videoRef} src={videoUrl} controls className="w-full"
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)} playsInline />
        </div>
        {/* Transcript */}
        <div className="md:w-1/2 overflow-y-auto p-4 bg-black/50">
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold mb-3">Transcript</p>
          {transcript ? (
            <p className="text-white/80 text-sm leading-relaxed">
              {words.map((word, i) => {
                // Highlight words based on rough time position
                const wordTime = (i / totalWords) * (videoRef.current?.duration || 60);
                const isActive = Math.abs(wordTime - currentTime) < 2;
                return (
                  <span key={i}
                    className={`transition-colors ${isActive ? 'text-violet-400 font-bold' : ''}`}
                    onClick={() => { if (videoRef.current) videoRef.current.currentTime = wordTime; }}>
                    {word}{' '}
                  </span>
                );
              })}
            </p>
          ) : (
            <p className="text-white/40 text-sm">No transcript available for this video.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Video Card ───────────────────────────────────────────────────────────────
const VideoCard = ({ video, currentUserId, onFeedbackGiven, onOpenFeedback, alreadyGaveFeedback }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(alreadyGaveFeedback || false);
  const [aiData, setAiData] = useState(video.aiAnalysis || null);
  const [showAI, setShowAI] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwn = video.userId === currentUserId;

  // Check follow status on mount
  useEffect(() => {
    if (isOwn || !video.userId) return;
    api.get(`/follow/${video.userId}/status`).then(({ data }) => setFollowing(data.following)).catch(() => {});
  }, [video.userId, isOwn]);

  const toggleFollow = async () => {
    setFollowLoading(true);
    try {
      if (following) {
        await api.delete(`/follow/${video.userId}`);
        setFollowing(false);
      } else {
        await api.post(`/follow/${video.userId}`);
        setFollowing(true);
      }
    } catch {}
    finally { setFollowLoading(false); }
  };

  // Auto-poll when status is processing
  useEffect(() => {
    if (!isOwn) return;
    let interval;
    const poll = async () => {
      try {
        const { data } = await api.get(`/daily-challenge/ai/${video._id}`);
        setAiData(data);
        if (data.status === 'done') { setShowAI(true); clearInterval(interval); }
        if (data.status === 'failed') clearInterval(interval);
      } catch {}
    };
    if (aiData?.status === 'processing') {
      poll();
      interval = setInterval(poll, 8000);
    }
    return () => clearInterval(interval);
  }, [aiData?.status, isOwn]);

  const loadAI = async () => {
    if (aiData?.status === 'done') { setShowAI(s => !s); return; }
    if (aiData?.status === 'processing') return;
    setLoadingAI(true);
    try {
      // Always fetch fresh status first
      const { data: fresh } = await api.get(`/daily-challenge/ai/${video._id}`);
      setAiData(fresh);
      if (fresh.status === 'done') { setShowAI(true); setLoadingAI(false); return; }
      // Trigger/retry analysis
      await api.post(`/daily-challenge/ai/${video._id}/retry`);
      setAiData(d => ({ ...d, status: 'processing' }));
    } catch {}
    finally { setLoadingAI(false); }
  };

  // Check on mount if current user already gave feedback
  useEffect(() => {
    if (!currentUserId || isOwn) return;
    if (alreadyGaveFeedback) { setHasFeedback(true); return; }
    api.get(`/daily-challenge/feedback/${video._id}`)
      .then(({ data }) => {
        setFeedbacks(data);
        setHasFeedback(data.some(f => f.reviewerId === currentUserId));
      })
      .catch(() => {});
  }, [video._id, currentUserId, alreadyGaveFeedback]);

  const loadFeedbacks = async () => {
    if (loadingFeedback) return;
    setLoadingFeedback(true);
    try {
      const { data } = await api.get(`/daily-challenge/feedback/${video._id}`);
      setFeedbacks(data);
      setHasFeedback(data.some(f => f.reviewerId === currentUserId));
    } catch {}
    finally { setLoadingFeedback(false); }
  };

  const toggleFeedbacks = () => {
    if (!showFeedbacks) loadFeedbacks();
    setShowFeedbacks(s => !s);
  };

  return (
    <>
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl border border-border overflow-hidden">
      {/* User info */}
      <div className="flex items-center gap-3 p-4 pb-0">
        <Avatar src={video.user?.avatarUrl} name={video.user?.name} size="10" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{video.user?.name || 'Anonymous'}</p>
          <p className="text-xs text-muted-foreground">@{video.user?.shortId}</p>
        </div>
        {isOwn ? (
          <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">You</span>
        ) : (
          <button onClick={toggleFollow} disabled={followLoading}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${following ? 'bg-accent text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : 'bg-primary/20 text-primary hover:bg-primary/30'}`}>
            {followLoading ? '...' : following ? 'Following' : '+ Follow'}
          </button>
        )}
      </div>

      {/* Video */}
      <div className="mt-3 mx-4 rounded-xl overflow-hidden bg-black aspect-video">
        <video
          src={video.videoUrl}
          controls
          preload="metadata"
          className="w-full h-full object-cover"
          playsInline
        />
      </div>

      {/* Caption */}
      {video.caption && (
        <p className="px-4 pt-3 text-sm text-muted-foreground">{video.caption}</p>
      )}

      {/* AI Feedback — only visible to video owner */}
      {isOwn && (
        <div className="mx-4 mt-3">
          <button onClick={loadAI} disabled={loadingAI}
            className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 text-violet-400 rounded-xl text-xs font-bold hover:bg-violet-500/20 transition-all w-full">
            <span>🤖</span>
            <span className="flex-1 text-left">
              {loadingAI ? 'Loading AI analysis...' :
               aiData?.status === 'done' ? (showAI ? 'Hide AI Feedback' : 'View AI Feedback') :
               aiData?.status === 'processing' ? 'AI is analyzing... check back soon' :
               aiData?.status === 'failed' ? '⚠️ AI analysis failed — tap to retry' :
               'Get AI Feedback'}
            </span>
            {aiData?.status === 'done' && !loadingAI && (
              <span className="px-2 py-0.5 bg-violet-500/20 rounded-full text-[10px] font-black">
                {aiData.scores?.overall}/10
              </span>
            )}
          </button>

          <AnimatePresence>
            {showAI && aiData?.status === 'done' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="mt-2 p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl space-y-3">
                  {/* Radar chart */}
                  <RadarChart scores={aiData.scores} />

                  {/* Score numbers */}
                  <div className="grid grid-cols-5 gap-1 text-center">
                    {Object.entries(aiData.scores || {}).map(([key, val]) => (
                      <div key={key} className="space-y-0.5">
                        <p className="text-[9px] text-muted-foreground capitalize">{key.slice(0,3)}</p>
                        <p className="text-xs font-black text-violet-400">{val}/10</p>
                      </div>
                    ))}
                  </div>

                  {/* AI written feedback */}
                  {aiData.feedback && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-violet-500/40 pl-3">{aiData.feedback}</p>
                  )}

                  {/* Strengths */}
                  {aiData.strengths?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Strengths</p>
                      {aiData.strengths.map((s, i) => <p key={i} className="text-xs text-emerald-400">✅ {s}</p>)}
                    </div>
                  )}

                  {/* Improvements */}
                  {aiData.improvements?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">To Improve</p>
                      {aiData.improvements.map((s, i) => <p key={i} className="text-xs text-amber-400">💡 {s}</p>)}
                    </div>
                  )}

                  {/* Transcript viewer button */}
                  {aiData.transcript && (
                    <button onClick={() => setShowTranscript(true)}
                      className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all">
                      📄 Rewatch with Transcript
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 p-4">
        {!isOwn && !hasFeedback && (
          <button onClick={() => onOpenFeedback(video, () => { setHasFeedback(true); onFeedbackGiven(); loadFeedbacks(); })}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
            <ThumbsUp size={14} /> Give Feedback
          </button>
        )}
        {hasFeedback && (
          <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold">
            ✓ Feedback Given
          </span>
        )}
        <button onClick={toggleFeedbacks}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent rounded-xl text-xs font-bold hover:bg-accent/80 transition-all ml-auto">
          {video.feedbackCount || 0} feedback{video.feedbackCount !== 1 ? 's' : ''}
          {showFeedbacks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Feedback list */}
      <AnimatePresence>
        {showFeedbacks && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
              {loadingFeedback && <p className="text-xs text-muted-foreground animate-pulse">Loading...</p>}
              {!loadingFeedback && feedbacks.length === 0 && (
                <p className="text-xs text-muted-foreground">No feedback yet. Be the first!</p>
              )}
              {feedbacks.map(f => (
                <FeedbackItem
                  key={f._id}
                  feedback={f}
                  currentUserId={currentUserId}
                  isVideoOwner={video.userId === currentUserId}
                  onDeleted={() => {
                    setFeedbacks(prev => prev.filter(x => x._id !== f._id));
                    if (f.reviewerId === currentUserId) setHasFeedback(false);
                  }}
                  onReplied={(reply) => setFeedbacks(prev => prev.map(x => x._id === f._id ? { ...x, ownerReply: reply, ownerRepliedAt: new Date() } : x))}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>

      {/* Transcript viewer */}
      {showTranscript && aiData?.transcript && (
        <TranscriptViewer
          videoUrl={video.videoUrl}
          transcript={aiData.transcript}
          onClose={() => setShowTranscript(false)}
        />
      )}
    </>
  );
};

// ─── Teleprompter ─────────────────────────────────────────────────────────────
const Teleprompter = ({ text: initialText, onClose, onTextChange, recording, recordingPaused, onStart, onStop, onResume, onFinish, onRestart }) => {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(24); // % display like the reference
  const [fontSize, setFontSize] = useState(28);
  const [align, setAlign] = useState('center'); // left | center | right
  const [mirror, setMirror] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [localText, setLocalText] = useState(initialText);
  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const containerRef = useRef(null);

  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => { if (!document.fullscreenElement) setFullscreen(false); };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (running && !editMode) {
      const scroll = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += (speed / 100) * 0.8;
          if (scrollRef.current.scrollTop >= scrollRef.current.scrollHeight - scrollRef.current.clientHeight) {
            setRunning(false); return;
          }
        }
        rafRef.current = requestAnimationFrame(scroll);
      };
      rafRef.current = requestAnimationFrame(scroll);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, speed, editMode]);

  // Controls bar — same for both minimized and fullscreen
  const ControlsBar = () => (
    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-black/85 backdrop-blur-sm flex-wrap flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      {editMode ? (
        <>
          <span className="text-[11px] text-white/50 font-bold">Editing...</span>
          <button onClick={() => { onTextChange?.(localText); setEditMode(false); }}
            className="px-2.5 py-1 rounded-md text-[11px] bg-emerald-500 text-white font-bold">✓ Done</button>
          <button onClick={() => { setLocalText(initialText); setEditMode(false); }}
            className="px-2 py-1 rounded-md text-[11px] bg-white/10 text-white">✕</button>
        </>
      ) : (
        <>
          {/* Play/Pause */}
          <button onClick={() => setRunning(r => !r)}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${running ? 'bg-amber-500 text-black' : 'bg-white/15 text-white'}`}
            title={running ? 'Pause' : 'Play'}>
            {running ? '⏸' : '▶'}
          </button>
          {/* Rewind */}
          <button onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; setRunning(false); }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm bg-white/10 text-white" title="Rewind">⏮</button>
          {/* Align */}
          <button onClick={() => setAlign(a => a === 'left' ? 'center' : a === 'center' ? 'right' : 'left')}
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm bg-white/10 text-white" title="Alignment">
            {align === 'left' ? '≡' : align === 'center' ? '☰' : '≡'}
          </button>
          {/* Mirror */}
          <button onClick={() => setMirror(m => !m)}
            className={`w-7 h-7 rounded-md flex items-center justify-center text-sm ${mirror ? 'bg-blue-500 text-white' : 'bg-white/10 text-white'}`} title="Mirror">⇔</button>
          {/* Edit */}
          <button onClick={() => { setRunning(false); setEditMode(true); }}
            className="w-7 h-7 rounded-md flex items-center justify-center text-sm bg-white/10 text-white" title="Edit script">✏</button>

          {/* Speed */}
          <div className="flex items-center gap-1 ml-1">
            <span className="text-[10px] text-amber-400 font-bold">🐢 {speed}%</span>
            <input type="range" min="5" max="100" step="5" value={speed} onChange={e => setSpeed(+e.target.value)}
              className="w-16 h-1 accent-amber-400" />
          </div>
          {/* Font size */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-blue-300 font-bold">Tт {fontSize}</span>
            <input type="range" min="14" max="60" step="2" value={fontSize} onChange={e => setFontSize(+e.target.value)}
              className="w-16 h-1 accent-blue-400" />
          </div>
        </>
      )}
      {/* Fullscreen toggle */}
      <button onClick={toggleFullscreen}
        className="w-7 h-7 rounded-md flex items-center justify-center text-sm bg-white/10 text-white ml-auto" title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
        {fullscreen ? '⊡' : '⛶'}
      </button>
      <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center text-sm bg-red-500/70 text-white" title="Close">✕</button>
    </div>
  );

  const textStyle = {
    fontSize: `${fontSize}px`,
    color: '#fff',
    fontFamily: 'sans-serif',
    lineHeight: 1.9,
    whiteSpace: 'pre-wrap',
    textAlign: align,
    transform: mirror ? 'scaleX(-1)' : 'none',
  };

  return (
    <div ref={containerRef}
      className="bg-black flex flex-col overflow-hidden"
      style={{
        position: fullscreen ? 'fixed' : 'absolute',
        inset: 0,
        zIndex: 210,
        borderRadius: fullscreen ? 0 : '0.75rem',
      }}>

      {/* Title bar — only in minimized mode */}
      {!fullscreen && !editMode && (
        <div className="px-3 py-1.5 bg-black/90 flex-shrink-0">
          <p className="text-white text-xs font-bold truncate opacity-70">{localText.split('\n')[0] || 'Teleprompter'}</p>
        </div>
      )}

      <ControlsBar />

      {/* Content */}
      {editMode ? (
        <textarea autoFocus value={localText} onChange={e => setLocalText(e.target.value)}
          className="flex-1 bg-black text-white px-8 py-6 outline-none resize-none"
          style={{ fontSize: '16px', lineHeight: 1.6 }}
          placeholder="Type your script here..." />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto py-8 select-none" style={{ scrollbarWidth: 'none', paddingLeft: '8%', paddingRight: '8%' }}>
          {/* Large padding top so text starts from center */}
          <div style={{ height: fullscreen ? '35vh' : '20px' }} />
          <p style={textStyle}>{localText || 'Tap ✏ to write your script...'}</p>
          <div style={{ height: '60vh' }} />
        </div>
      )}

      {/* Bottom fade */}
      {!editMode && (
        <div className="absolute left-0 right-0 h-20 pointer-events-none"
          style={{ bottom: fullscreen ? '60px' : '0', background: 'linear-gradient(transparent, black)' }} />
      )}

      {/* Recording controls at bottom — fullscreen only */}
      {fullscreen && !editMode && (
        <div className="flex-shrink-0 px-4 py-3 bg-black/90 border-t border-white/10 flex items-center justify-center gap-3">
          {!recording ? (
            <button onClick={onStart}
              className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white rounded-full font-bold text-sm active:scale-95 transition-all shadow-lg shadow-red-500/30">
              <div className="h-3 w-3 rounded-full bg-white animate-pulse" /> RECORD
            </button>
          ) : recordingPaused ? (
            <div className="flex gap-3">
              <button onClick={onResume} className="flex flex-col items-center gap-1 px-5 py-2.5 bg-emerald-500 text-white rounded-2xl font-bold text-xs">▶<span>Resume</span></button>
              <button onClick={onFinish} className="flex flex-col items-center gap-1 px-5 py-2.5 bg-primary text-primary-foreground rounded-2xl font-bold text-xs">✓<span>Submit</span></button>
              <button onClick={onRestart} className="flex flex-col items-center gap-1 px-5 py-2.5 bg-white/10 text-white rounded-2xl font-bold text-xs">↺<span>Restart</span></button>
            </div>
          ) : (
            <button onClick={onStop}
              className="flex items-center gap-2 px-8 py-3 bg-red-500 text-white rounded-full font-bold text-sm active:scale-95 transition-all">
              <div className="h-4 w-4 rounded-sm bg-white" /> STOP
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Video Trimmer ────────────────────────────────────────────────────────────
const VideoTrimmer = ({ videoUrl, onTrimmed, onSkip }) => {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimming, setTrimming] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => { setDuration(v.duration); setTrimEnd(v.duration); };
    v.addEventListener('loadedmetadata', onLoaded);
    v.addEventListener('timeupdate', () => setCurrentTime(v.currentTime));
    return () => v.removeEventListener('loadedmetadata', onLoaded);
  }, []);

  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  const applyTrim = async () => {
    // Browser-side trim using MediaRecorder re-encode trick
    // We seek to trimStart, record until trimEnd
    setTrimming(true);
    try {
      const video = videoRef.current;
      video.currentTime = trimStart;
      await new Promise(r => { video.onseeked = r; });

      const stream = video.captureStream ? video.captureStream() : video.mozCaptureStream();
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.start();
      video.play();

      await new Promise(resolve => {
        const check = setInterval(() => {
          if (video.currentTime >= trimEnd) {
            clearInterval(check);
            recorder.stop();
            video.pause();
            resolve();
          }
        }, 100);
      });

      await new Promise(r => { recorder.onstop = r; });
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], `trimmed-${Date.now()}.webm`, { type: 'video/webm' });
      onTrimmed(file, URL.createObjectURL(blob));
    } catch (err) {
      console.error('Trim failed:', err);
      onSkip(); // fallback — skip trim
    } finally {
      setTrimming(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">✂️ Trim Video</p>
      <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
        <video ref={videoRef} src={videoUrl} className="w-full h-full object-cover" playsInline
          onClick={() => { const v = videoRef.current; v.paused ? v.play() : v.pause(); }} />
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-mono">
          {fmt(currentTime)} / {fmt(duration)}
        </div>
      </div>

      {/* Trim range */}
      <div className="space-y-2 p-3 bg-accent/20 rounded-xl">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Start: <span className="font-bold text-foreground">{fmt(trimStart)}</span></span>
          <span>End: <span className="font-bold text-foreground">{fmt(trimEnd)}</span></span>
          <span>Duration: <span className="font-bold text-primary">{fmt(trimEnd - trimStart)}</span></span>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Start</label>
          <input type="range" min="0" max={duration} step="0.1" value={trimStart}
            onChange={e => { const v = +e.target.value; if (v < trimEnd) { setTrimStart(v); if (videoRef.current) videoRef.current.currentTime = v; } }}
            className="w-full h-2 accent-emerald-500" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">End</label>
          <input type="range" min="0" max={duration} step="0.1" value={trimEnd}
            onChange={e => { const v = +e.target.value; if (v > trimStart) setTrimEnd(v); }}
            className="w-full h-2 accent-red-500" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onSkip} className="flex-1 py-2.5 bg-accent rounded-xl text-sm font-bold hover:bg-accent/80 transition-all">
          Skip Trim
        </button>
        <button onClick={applyTrim} disabled={trimming || trimEnd - trimStart < 1}
          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
          {trimming ? <><Loader2 size={16} className="animate-spin" /> Trimming...</> : '✂️ Apply Trim'}
        </button>
      </div>
    </div>
  );
};

// ─── Submit Section ───────────────────────────────────────────────────────────
const SubmitSection = ({ challenge, onSubmitted }) => {
  const [mode, setMode] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingPaused, setRecordingPaused] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const chunksRef = useRef([]);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterText, setTeleprompterText] = useState(challenge?.topic || '');
  const [showTrimmer, setShowTrimmer] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `challenge-${Date.now()}.webm`, { type: 'video/webm' });
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(blob));
        if (videoRef.current) videoRef.current.srcObject = null;
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
      setRecordingPaused(false);

      setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 90000);
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  // Stop → show Resume/Submit/Restart options
  const pauseRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      setRecordingPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      setRecordingPaused(false);
    }
  };

  const finishRecording = () => {
    if (mediaRecorder && (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused')) {
      mediaRecorder.stop();
      setRecording(false);
      setRecordingPaused(false);
    }
  };

  const restartRecording = () => {
    if (mediaRecorder) {
      try { mediaRecorder.stop(); } catch {}
    }
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setRecording(false);
    setRecordingPaused(false);
    setMediaRecorder(null);
    chunksRef.current = [];
    setTimeout(startRecording, 200);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) { setError('Please select a video file'); return; }
    if (file.size > 100 * 1024 * 1024) { setError('Video must be under 100MB'); return; }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async () => {
    if (!videoFile) { setError('Please record or upload a video first'); return; }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('video', videoFile);
      if (caption.trim()) formData.append('caption', caption.trim());
      await api.post(`/daily-challenge/${challenge._id}/submit`, formData);
      onSubmitted();
    } catch (err) {
      setError(err?.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setMode(null);
    setError('');
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  };

  if (!mode) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Submit your response</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setMode('record')}
            className="flex flex-col items-center gap-2 p-5 bg-primary/10 border-2 border-primary/30 hover:border-primary rounded-2xl transition-all group">
            <Video size={24} className="text-primary group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold">Record Video</span>
            <span className="text-[10px] text-muted-foreground">Use your camera</span>
          </button>
          <button onClick={() => setMode('upload')}
            className="flex flex-col items-center gap-2 p-5 bg-accent/30 border-2 border-border hover:border-primary rounded-2xl transition-all group">
            <Upload size={24} className="text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all" />
            <span className="text-sm font-bold">Upload Video</span>
            <span className="text-[10px] text-muted-foreground">From your device</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          {mode === 'record' ? 'Record your response' : 'Upload your video'}
        </p>
        <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
      </div>

      {error && <div className="px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">{error}</div>}

      {mode === 'record' && !videoPreview && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            {/* Teleprompter overlay on top of camera */}
            {showTeleprompter && (
              <div className="absolute inset-0 z-10">
                <Teleprompter text={teleprompterText} onClose={() => setShowTeleprompter(false)}
                  onTextChange={t => setTeleprompterText(t)}
                  recording={recording} recordingPaused={recordingPaused}
                  onStart={startRecording} onStop={pauseRecording}
                  onResume={resumeRecording} onFinish={finishRecording} onRestart={restartRecording} />
              </div>
            )}
          </div>

          {/* Teleprompter toggle + text input */}
          {!showTeleprompter && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-bold">Teleprompter</span>
                <button onClick={() => setShowTeleprompter(true)}
                  className="px-3 py-1.5 bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded-xl text-xs font-bold hover:bg-violet-500/30 transition-all">
                  📜 Open Teleprompter
                </button>
              </div>
              <textarea rows={2} placeholder="Type your script here..."
                value={teleprompterText} onChange={e => setTeleprompterText(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-accent/30 border border-border outline-none text-xs resize-none" />
            </div>
          )}

          {!recording ? (
            <button onClick={startRecording}
              className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold hover:bg-red-600 transition-all flex items-center justify-center gap-2">
              <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
              Start Recording
            </button>
          ) : recordingPaused ? (
            // Paused — show Resume / Submit / Restart
            <div className="space-y-2">
              <p className="text-xs text-center text-amber-400 font-bold">⏸ Recording paused</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={resumeRecording}
                  className="py-3 bg-emerald-500 text-white rounded-2xl font-bold text-sm flex flex-col items-center gap-1 hover:bg-emerald-600 transition-all">
                  <span>▶</span><span className="text-[10px]">Resume</span>
                </button>
                <button onClick={finishRecording}
                  className="py-3 bg-primary text-primary-foreground rounded-2xl font-bold text-sm flex flex-col items-center gap-1 hover:bg-primary/90 transition-all">
                  <span>✓</span><span className="text-[10px]">Submit</span>
                </button>
                <button onClick={restartRecording}
                  className="py-3 bg-accent border border-border text-foreground rounded-2xl font-bold text-sm flex flex-col items-center gap-1 hover:bg-accent/80 transition-all">
                  <span>↺</span><span className="text-[10px]">Restart</span>
                </button>
              </div>
            </div>
          ) : (
            // Recording — red stop button
            <button onClick={pauseRecording}
              className="w-full py-3 bg-red-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 active:scale-95">
              <div className="h-4 w-4 rounded-sm bg-white" />
              Stop Recording
            </button>
          )}
          <p className="text-xs text-muted-foreground text-center">Max 90 seconds · Video only (no audio-only)</p>
        </div>
      )}

      {mode === 'upload' && !videoPreview && (
        <label className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border hover:border-primary rounded-2xl cursor-pointer transition-all">
          <Upload size={32} className="text-muted-foreground" />
          <div className="text-center">
            <p className="font-bold text-sm">Choose video file</p>
            <p className="text-xs text-muted-foreground mt-1">MP4, MOV, WEBM · Max 100MB</p>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={handleFileSelect} />
        </label>
      )}

      {videoPreview && !showTrimmer && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
            <video src={videoPreview} controls className="w-full h-full object-cover" playsInline />
            <button onClick={reset}
              className="absolute top-2 right-2 h-8 w-8 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors z-10">
              <X size={16} />
            </button>
          </div>
          <input type="text" placeholder="Add a caption (optional)"
            value={caption} onChange={e => setCaption(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setShowTrimmer(true)}
              className="flex items-center gap-1.5 px-4 py-3 bg-accent border border-border rounded-xl text-sm font-bold hover:bg-accent/80 transition-all">
              ✂️ Trim
            </button>
            <button onClick={reset}
              className="flex items-center gap-1.5 px-4 py-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-sm font-bold hover:bg-destructive/20 transition-all">
              <X size={16} /> Remove
            </button>
            <button onClick={handleSubmit} disabled={uploading}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {uploading ? 'Uploading...' : 'Submit Response'}
            </button>
          </div>
        </div>
      )}

      {videoPreview && showTrimmer && (
        <VideoTrimmer
          videoUrl={videoPreview}
          onTrimmed={(file, url) => { setVideoFile(file); setVideoPreview(url); setShowTrimmer(false); }}
          onSkip={() => setShowTrimmer(false)}
        />
      )}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DailyChallenge() {
  const { user } = useAuth();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedTotal, setFeedTotal] = useState(0);
  const [feedSort, setFeedSort] = useState('recent'); // recent | top_feedback | top_ai
  // Single global feedback modal — only one can be open at a time
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [feedbackGivenSet, setFeedbackGivenSet] = useState(new Set());

  useEffect(() => {
    api.get('/daily-challenge/today')
      .then(({ data }) => {
        setChallenge(data);
        setSubmitted(data.hasSubmitted);
        // Always load feed — not gated behind submission
        loadFeed(data._id, 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadFeed = async (challengeId, page = 1, sort = feedSort) => {
    setFeedLoading(true);
    try {
      const { data } = await api.get(`/daily-challenge/${challengeId}/feed?page=${page}&sort=${sort}`);
      if (page === 1) setFeed(data.videos);
      else setFeed(prev => [...prev, ...data.videos]);
      setFeedTotal(data.total);
      setFeedPage(page);
    } catch (err) {
      console.error(err);
    } finally { setFeedLoading(false); }
  };

  const handleSortChange = (sort) => {
    setFeedSort(sort);
    if (challenge) loadFeed(challenge._id, 1, sort);
  };

  const handleSubmitted = () => {
    setSubmitted(true);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 4000);
    if (challenge) loadFeed(challenge._id, 1);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto pb-24 pt-4">
        <div className="glass-card p-8 rounded-2xl animate-pulse h-48" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-2xl mx-auto pb-24 pt-4 text-center py-20">
        <Video size={48} className="text-muted-foreground/30 mx-auto mb-4" />
        <p className="font-bold text-lg">No challenge today yet</p>
        <p className="text-sm text-muted-foreground mt-1">Check back soon — the admin posts a new topic daily</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pt-4 space-y-6 px-0 sm:px-0"
      style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom, 0px))' }}>
      {/* Success banner */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold shadow-2xl flex items-center gap-2">
            🎉 Submitted! Your streak is growing 🔥
          </motion.div>
        )}
      </AnimatePresence>

      {/* Challenge card */}
      <div className="glass-card p-6 rounded-2xl border border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-black rounded-full uppercase tracking-wider">
              Today's Challenge
            </span>
            <span className="text-xs text-muted-foreground">{challenge.date}</span>
          </div>
          <div className="flex items-center gap-2">
            {challenge.dueTime && (
              <span className="text-xs text-muted-foreground font-bold">Due {challenge.dueTime}</span>
            )}
            {user?.streakCount > 0 && (
              <div className="flex items-center gap-1 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full">
                <Flame size={14} />
                <span className="text-xs font-black">{user.streakCount} day streak</span>
              </div>
            )}
          </div>
        </div>

        <h2 className="text-2xl font-black mb-2">{challenge.topic}</h2>
        {challenge.description && (
          <p className="text-sm text-muted-foreground mb-4">{challenge.description}</p>
        )}

        {challenge.tips?.length > 0 && (
          <div className="p-3 bg-accent/30 rounded-xl mb-4">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Tips</p>
            <ul className="space-y-1">
              {challenge.tips.map((tip, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <ArrowRight size={12} className="text-primary mt-0.5 flex-shrink-0" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {submitted ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="text-emerald-400 font-bold text-sm">✅ You've submitted today's challenge!</span>
          </div>
        ) : (
          <SubmitSection challenge={challenge} onSubmitted={handleSubmitted} />
        )}
      </div>

      {/* Feed — always visible */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-black text-lg">Today's Responses</h3>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">{feedTotal}</span>
            {[
              { key: 'recent', label: '🕐 Recent' },
              { key: 'top_feedback', label: '💬 Top' },
              { key: 'top_ai', label: '🤖 AI Score' },
            ].map(s => (
              <button key={s.key} onClick={() => handleSortChange(s.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${feedSort === s.key ? 'bg-primary text-primary-foreground' : 'bg-accent/40 text-muted-foreground hover:text-foreground'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {feedLoading && feed.length === 0 && (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="glass-card p-5 rounded-2xl animate-pulse h-64" />)}
          </div>
        )}

        {!feedLoading && feed.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-bold">No submissions yet today</p>
            <p className="text-sm mt-1">Be the first to submit your response!</p>
          </div>
        )}

        {feed.map(video => (
          <VideoCard key={video._id} video={video} currentUserId={user?._id || user?.id}
            alreadyGaveFeedback={feedbackGivenSet.has(video._id)}
            onFeedbackGiven={() => {}}
            onOpenFeedback={(v, cb) => setActiveFeedback({ video: v, onSubmitted: cb })} />
        ))}

        {feed.length < feedTotal && (
          <button onClick={() => loadFeed(challenge._id, feedPage + 1)} disabled={feedLoading}
            className="w-full py-3 bg-accent rounded-xl text-sm font-bold hover:bg-accent/80 transition-all disabled:opacity-50">
            {feedLoading ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>

      {/* Single global feedback modal — only one open at a time */}
      <AnimatePresence>
        {activeFeedback && (
          <FeedbackModal
            video={activeFeedback.video}
            onClose={() => setActiveFeedback(null)}
            onSubmitted={() => {
              setFeedbackGivenSet(prev => new Set([...prev, activeFeedback.video._id]));
              activeFeedback.onSubmitted();
              setActiveFeedback(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
