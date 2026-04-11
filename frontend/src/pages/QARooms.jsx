import React, { useState, useEffect } from 'react';
import { MessageCircleQuestion, Clock, CheckCircle, Plus, X, Send, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import api from '../services/api';

const statusColor = (s) => {
  if (s === 'live') return 'bg-emerald-500/20 text-emerald-400';
  if (s === 'completed') return 'bg-accent text-muted-foreground';
  return 'bg-amber-500/20 text-amber-400';
};

const CreateRoomModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({ title: '', scheduledAt: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/qa', { title: form.title, scheduledAt: form.scheduledAt || null });
      onSuccess();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to create room');
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
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-lg">Host Q&A Session</h3>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent"><X size={16} /></button>
        </div>
        {error && <div className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive/30 rounded-xl text-sm text-destructive">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Session Title *</label>
            <input type="text" placeholder="e.g. Ask Me Anything About React"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5 block">Scheduled Date & Time</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            {loading ? 'Creating...' : 'Create Session'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

const QARoomDetail = ({ room, currentUserId, onClose }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [answeringId, setAnsweringId] = useState(null);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');

  const isHost = room.hostId?._id === currentUserId || room.hostId === currentUserId;

  useEffect(() => {
    api.get(`/qa/${room._id}/questions`)
      .then(({ data }) => setQuestions(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [room._id]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post(`/qa/${room._id}/questions`, { question });
      setQuestions(prev => [...prev, { _id: data.id, question, askerName: 'You', answer: null }]);
      setQuestion('');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = async (questionId) => {
    if (!answer.trim()) return;
    try {
      await api.put(`/qa/questions/${questionId}`, { answer });
      setQuestions(prev => prev.map(q => q._id === questionId ? { ...q, answer } : q));
      setAnsweringId(null);
      setAnswer('');
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to answer');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        className="w-full max-w-lg glass-card rounded-3xl border border-border shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
          <div>
            <h3 className="font-black text-lg">{room.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hosted by {room.hostName || room.hostId?.name || 'Unknown'}
              {room.skillName && <span className="ml-2 text-primary font-bold">· {room.skillName}</span>}
            </p>
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-xl hover:bg-accent flex-shrink-0"><X size={16} /></button>
        </div>

        {/* Questions */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground animate-pulse text-sm">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No questions yet. Be the first to ask!</div>
          ) : (
            questions.map((q, i) => (
              <div key={q._id || i} className="space-y-2">
                <div className="p-3 bg-accent/30 rounded-xl">
                  <p className="text-sm font-bold">{q.question}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">{q.askerName || q.asker_name || 'Anonymous'}</p>
                </div>
                {q.answer ? (
                  <div className="ml-4 p-3 bg-primary/10 border-l-4 border-primary rounded-r-xl">
                    <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Answer</p>
                    <p className="text-sm">{q.answer}</p>
                  </div>
                ) : isHost ? (
                  answeringId === q._id ? (
                    <div className="ml-4 space-y-2">
                      <textarea rows={2} placeholder="Write your answer..."
                        value={answer} onChange={e => setAnswer(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => handleAnswer(q._id)}
                          className="flex-1 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:scale-[1.02] transition-all">
                          Post Answer
                        </button>
                        <button onClick={() => { setAnsweringId(null); setAnswer(''); }}
                          className="px-3 py-2 bg-accent rounded-xl text-xs font-bold">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => { setAnsweringId(q._id); setAnswer(''); }}
                      className="ml-4 text-xs text-primary font-bold hover:underline">
                      Answer this question
                    </button>
                  )
                ) : (
                  <p className="ml-4 text-xs text-muted-foreground italic">Awaiting answer...</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Ask Question */}
        {!isHost && (
          <div className="p-4 border-t border-border flex-shrink-0">
            {error && <p className="text-xs text-destructive mb-2">{error}</p>}
            <form onSubmit={handleAsk} className="flex gap-2">
              <input type="text" placeholder="Ask a question..."
                value={question} onChange={e => setQuestion(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent/30 border border-border focus:ring-2 focus:ring-primary/50 outline-none text-sm" />
              <button type="submit" disabled={submitting || !question.trim()}
                className="h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </form>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default function QARooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);

  const currentUserId = user?._id || user?.id;

  const fetchRooms = async () => {
    try {
      const { data } = await api.get('/qa');
      setRooms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageCircleQuestion size={24} className="text-primary" />
          <h1 className="text-2xl font-black tracking-tight">Q&A Sessions</h1>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20">
          <Plus size={16} /> Host Session
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="glass-card p-5 rounded-2xl animate-pulse h-28" />)}
        </div>
      ) : rooms.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground flex flex-col items-center gap-3">
          <MessageCircleQuestion size={48} className="opacity-20" />
          <p className="font-bold">No Q&A sessions yet</p>
          <p className="text-sm">Host a session to share your expertise</p>
          <button onClick={() => setShowCreate(true)}
            className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-primary/20">
            Host a Session
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rooms.map((room, idx) => {
            const isHost = room.hostId?._id === currentUserId || room.hostId === currentUserId;
            return (
              <motion.div key={room._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                className="glass-card rounded-2xl border border-border p-5 hover:border-primary/30 transition-all cursor-pointer group"
                onClick={() => setActiveRoom(room)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-black text-base group-hover:text-primary transition-colors">{room.title}</h3>
                      {isHost && (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">Host</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      by <span className="font-bold text-foreground">{room.hostName || room.host_name || 'Unknown'}</span>
                      {room.skillName && <span className="ml-2 text-primary font-bold">· {room.skillName}</span>}
                    </p>
                    {(room.scheduledAt || room.scheduled_at) && (
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                        <Clock size={12} />
                        <span>{format(new Date(room.scheduledAt || room.scheduled_at), 'EEE, MMM d · h:mm a')}</span>
                      </div>
                    )}
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${statusColor(room.status)}`}>
                    {room.status || 'scheduled'}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Click to view questions & answers</p>
                  <ChevronDown size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <CreateRoomModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchRooms(); }} />
        )}
        {activeRoom && (
          <QARoomDetail room={activeRoom} currentUserId={currentUserId} onClose={() => setActiveRoom(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
