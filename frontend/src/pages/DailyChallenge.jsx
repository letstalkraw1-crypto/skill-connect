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

// ─── Video Card ───────────────────────────────────────────────────────────────
const VideoCard = ({ video, currentUserId, onFeedbackGiven, onOpenFeedback, alreadyGaveFeedback }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(alreadyGaveFeedback || false);
  const [aiData, setAiData] = useState(video.aiAnalysis || null);
  const [showAI, setShowAI] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);

  const isOwn = video.userId === currentUserId;

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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl border border-border overflow-hidden">
      {/* User info */}
      <div className="flex items-center gap-3 p-4 pb-0">
        <Avatar src={video.user?.avatarUrl} name={video.user?.name} size="10" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{video.user?.name || 'Anonymous'}</p>
          <p className="text-xs text-muted-foreground">@{video.user?.shortId}</p>
        </div>
        {isOwn && <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">You</span>}
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
                  {/* Score grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(aiData.scores || {}).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between px-3 py-2 bg-background/50 rounded-lg">
                        <span className="text-xs text-muted-foreground capitalize">{key}</span>
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-violet-500 rounded-full" style={{ width: `${val * 10}%` }} />
                          </div>
                          <span className="text-xs font-black text-violet-400">{val}</span>
                        </div>
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
  );
};

// ─── Teleprompter ─────────────────────────────────────────────────────────────
const Teleprompter = ({ text: initialText, onClose, onTextChange }) => {
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fontSize, setFontSize] = useState(24);
  const [color, setColor] = useState('#ffffff');
  const [font, setFont] = useState('sans-serif');
  const [fullscreen, setFullscreen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [localText, setLocalText] = useState(initialText);
  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const containerRef = useRef(null);

  // Use browser Fullscreen API when toggling
  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  // Sync fullscreen state with browser ESC key
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (running && !editMode) {
      const scroll = () => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop += speed * 0.1;
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

  const fonts = ['sans-serif', 'serif', 'monospace', 'Georgia', 'Arial'];

  const handleSaveText = () => {
    onTextChange?.(localText);
    setEditMode(false);
  };

  return (
    <div ref={containerRef}
      className="bg-black flex flex-col overflow-hidden"
      style={{ position: fullscreen ? 'fixed' : 'absolute', inset: 0, zIndex: 210, borderRadius: fullscreen ? 0 : '0.75rem' }}>

      {/* Controls bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/90 border-b border-white/10 flex-wrap flex-shrink-0">
        {!editMode ? (
          <>
            <button onClick={() => setRunning(r => !r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${running ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
              {running ? '⏸ Pause' : '▶ Start'}
            </button>
            <button onClick={() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; setRunning(false); }}
              className="px-2 py-1.5 rounded-lg text-xs bg-white/10 text-white">↺</button>
            <button onClick={() => { setRunning(false); setEditMode(true); }}
              className="px-2 py-1.5 rounded-lg text-xs bg-blue-500/30 text-blue-300">✏️ Edit</button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/40">Spd</span>
              <input type="range" min="1" max="10" value={speed} onChange={e => setSpeed(+e.target.value)} className="w-14 h-1 accent-emerald-400" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/40">Sz</span>
              <input type="range" min="14" max="56" value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-14 h-1 accent-blue-400" />
            </div>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" title="Text color" />
            <select value={font} onChange={e => setFont(e.target.value)}
              className="text-[10px] bg-white/10 text-white rounded px-1 py-1 border-0 outline-none">
              {fonts.map(f => <option key={f} value={f} style={{ background: '#000' }}>{f}</option>)}
            </select>
          </>
        ) : (
          <>
            <span className="text-xs text-white/60 font-bold">Editing script...</span>
            <button onClick={handleSaveText} className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500 text-white font-bold">✓ Done</button>
            <button onClick={() => { setLocalText(initialText); setEditMode(false); }} className="px-2 py-1.5 rounded-lg text-xs bg-white/10 text-white">Cancel</button>
          </>
        )}
        <button onClick={toggleFullscreen} className="ml-auto px-2 py-1.5 rounded-lg text-xs bg-white/10 text-white">
          {fullscreen ? '⊡ Exit' : '⛶ Full'}
        </button>
        <button onClick={onClose} className="px-2 py-1.5 rounded-lg text-xs bg-white/10 text-white">✕</button>
      </div>

      {/* Content area */}
      {editMode ? (
        <textarea
          autoFocus
          value={localText}
          onChange={e => setLocalText(e.target.value)}
          className="flex-1 bg-black text-white px-8 py-6 outline-none resize-none"
          style={{ fontSize: `${Math.min(fontSize, 20)}px`, fontFamily: font, color, lineHeight: 1.6 }}
          placeholder="Type your script here..."
        />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6 select-none" style={{ scrollbarWidth: 'none' }}>
          <p style={{ fontSize: `${fontSize}px`, color, fontFamily: font, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
            {localText || 'Tap ✏️ Edit to write your script...'}
          </p>
          <div style={{ height: '60vh' }} />
        </div>
      )}

      {/* Bottom fade */}
      {!editMode && (
        <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(transparent, black)' }} />
      )}
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
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  const [teleprompterText, setTeleprompterText] = useState(challenge?.topic || '');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const file = new File([blob], `challenge-${Date.now()}.webm`, { type: 'video/webm' });
        setVideoFile(file);
        setVideoPreview(URL.createObjectURL(blob));
        if (videoRef.current) videoRef.current.srcObject = null;
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecordedChunks(chunks);
      setRecording(true);

      // Auto-stop at 90 seconds
      setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 90000);
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setRecording(false);
    }
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
                  onTextChange={t => setTeleprompterText(t)} />
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
          ) : (
            <button onClick={stopRecording}
              className="w-full py-3 bg-accent border-2 border-red-500 text-red-500 rounded-2xl font-bold hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
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

      {videoPreview && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden bg-black aspect-video relative">
            <video src={videoPreview} controls className="w-full h-full object-cover" playsInline />
            {/* Remove button overlay */}
            <button onClick={reset}
              className="absolute top-2 right-2 h-8 w-8 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors z-10">
              <X size={16} />
            </button>
          </div>
          <input type="text" placeholder="Add a caption (optional)"
            value={caption} onChange={e => setCaption(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
          <div className="flex gap-2">
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
  // Single global feedback modal — only one can be open at a time
  const [activeFeedback, setActiveFeedback] = useState(null); // { video, onSubmitted }
  // Track which video IDs current user already gave feedback on — persists across re-renders
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

  const loadFeed = async (challengeId, page = 1) => {
    setFeedLoading(true);
    try {
      const { data } = await api.get(`/daily-challenge/${challengeId}/feed?page=${page}`);
      if (page === 1) setFeed(data.videos);
      else setFeed(prev => [...prev, ...data.videos]);
      setFeedTotal(data.total);
      setFeedPage(page);
    } catch (err) {
      console.error(err);
    } finally { setFeedLoading(false); }
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
    <div className="max-w-2xl mx-auto pb-24 pt-4 space-y-6">
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
        <div className="flex items-center justify-between">
          <h3 className="font-black text-lg">Today's Responses</h3>
          <span className="text-xs text-muted-foreground">{feedTotal} submissions</span>
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
