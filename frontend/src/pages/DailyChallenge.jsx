import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Video, Upload, Send, Star, ThumbsUp, ArrowRight, Loader2, X, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from '../components/Avatar';
import api from '../services/api';

// ─── Feedback Modal ───────────────────────────────────────────────────────────
const FeedbackModal = ({ video, onClose, onSubmitted }) => {
  const [positive, setPositive] = useState('');
  const [improvement, setImprovement] = useState('');
  const [ratings, setRatings] = useState({ confidence: 0, clarity: 0, structure: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!positive.trim() || !improvement.trim()) {
      setError('Both fields are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post(`/daily-challenge/feedback/${video._id}`, {
        positive, improvement,
        ratings: Object.values(ratings).some(v => v > 0) ? ratings : undefined,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  const RatingStars = ({ label, field }) => (
    <div className="space-y-1">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setRatings(r => ({ ...r, [field]: n }))}
            className={`transition-colors ${n <= ratings[field] ? 'text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'}`}>
            <Star size={18} className={n <= ratings[field] ? 'fill-current' : ''} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 sm:items-center"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-md glass-card rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col"
        style={{ maxHeight: '85vh' }}>
        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-6 pt-4 pb-2 flex-shrink-0">
          <div>
            <h3 className="font-black text-lg">Give Feedback</h3>
            <p className="text-xs text-muted-foreground">to {video.user?.name}</p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 flex-1">
          {error && <div className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-1.5 block">✅ What they did well *</label>
              <textarea rows={3} placeholder="e.g. Great eye contact, confident tone..."
                value={positive} onChange={e => setPositive(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-emerald-500/50 outline-none text-sm resize-none" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1.5 block">💡 One thing to improve *</label>
              <textarea rows={3} placeholder="e.g. Try to slow down a bit, use more examples..."
                value={improvement} onChange={e => setImprovement(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-amber-500/50 outline-none text-sm resize-none" />
            </div>

            <div className="p-4 bg-accent/20 rounded-xl space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Optional Ratings</p>
              <RatingStars label="Confidence" field="confidence" />
              <RatingStars label="Clarity" field="clarity" />
              <RatingStars label="Structure" field="structure" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Video Card ───────────────────────────────────────────────────────────────
const VideoCard = ({ video, currentUserId, onFeedbackGiven }) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [showFeedbacks, setShowFeedbacks] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);

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

  const isOwn = video.userId === currentUserId;

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

      {/* Actions */}
      <div className="flex items-center gap-2 p-4">
        {!isOwn && !hasFeedback && (
          <button onClick={() => setFeedbackModal(true)}
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
                <div key={f._id} className="p-3 bg-accent/30 rounded-xl space-y-2">
                  <div className="flex items-center gap-2">
                    <Avatar src={f.reviewer?.avatarUrl} name={f.reviewer?.name} size="8" />
                    <p className="text-xs font-bold">{f.reviewer?.name || 'Anonymous'}</p>
                  </div>
                  <p className="text-xs text-emerald-400"><span className="font-bold">✅ </span>{f.positive}</p>
                  <p className="text-xs text-amber-400"><span className="font-bold">💡 </span>{f.improvement}</p>
                  {f.ratings && Object.values(f.ratings).some(v => v > 0) && (
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      {f.ratings.confidence > 0 && <span>Confidence: {'⭐'.repeat(f.ratings.confidence)}</span>}
                      {f.ratings.clarity > 0 && <span>Clarity: {'⭐'.repeat(f.ratings.clarity)}</span>}
                      {f.ratings.structure > 0 && <span>Structure: {'⭐'.repeat(f.ratings.structure)}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {feedbackModal && (
          <FeedbackModal video={video} onClose={() => setFeedbackModal(false)}
            onSubmitted={() => { setHasFeedback(true); onFeedbackGiven(); loadFeedbacks(); }} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─── Submit Section ───────────────────────────────────────────────────────────
const SubmitSection = ({ challenge, onSubmitted }) => {
  const [mode, setMode] = useState(null); // 'record' | 'upload'
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
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
          <div className="rounded-xl overflow-hidden bg-black aspect-video">
            <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          </div>
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
            onFeedbackGiven={() => {}} />
        ))}

        {feed.length < feedTotal && (
          <button onClick={() => loadFeed(challenge._id, feedPage + 1)} disabled={feedLoading}
            className="w-full py-3 bg-accent rounded-xl text-sm font-bold hover:bg-accent/80 transition-all disabled:opacity-50">
            {feedLoading ? 'Loading...' : 'Load More'}
          </button>
        )}
      </div>
    </div>
  );
}
