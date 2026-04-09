import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService } from '../services/api';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, RefreshCw, ArrowUp } from 'lucide-react';
import PostCard from './PostCard';
import PostSkeleton from './PostSkeleton';
import { useSocketContext } from '../context/SocketContext';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const [newPostCount, setNewPostCount] = useState(0);
  const { on } = useSocketContext() || {};
  const navigate = useNavigate();

  const fetchPosts = useCallback(async (page = 1, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await postService.getFeed(page);
      if (data.docs) {
        setPosts(data.docs);
        setPagination({ page: data.page, totalPages: data.totalPages, totalDocs: data.totalDocs });
      } else {
        setPosts(Array.isArray(data) ? data : []);
      }
      setNewPostCount(0);
      setError('');
    } catch (err) {
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Real-time: new post from someone
  useEffect(() => {
    if (!on) return;
    const unsubNew = on('new_post', (post) => {
      // If we're on page 1, prepend it; otherwise show banner
      setPosts(prev => {
        const exists = prev.some(p => (p._id || p.id) === (post._id || post.id));
        if (exists) return prev;
        if (pagination?.page === 1 || !pagination) {
          return [post, ...prev];
        }
        setNewPostCount(c => c + 1);
        return prev;
      });
    });

    // Real-time: like count update
    const unsubUpdate = on('post_updated', ({ postId, likeCount }) => {
      setPosts(prev => prev.map(p =>
        (p._id || p.id) === postId ? { ...p, likeCount, likes_count: likeCount } : p
      ));
    });

    return () => { unsubNew(); unsubUpdate(); };
  }, [on, pagination]);

  // Auto-refresh every 60 seconds silently
  useEffect(() => {
    const interval = setInterval(() => fetchPosts(1, true), 60000);
    return () => clearInterval(interval);
  }, [fetchPosts]);

  if (loading && !posts.length) {
    return <div className="space-y-6">{[1, 2, 3].map(i => <PostSkeleton key={i} />)}</div>;
  }

  return (
    <div className="space-y-6">
      {/* New posts banner */}
      <AnimatePresence>
        {newPostCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onClick={() => fetchPosts(1)}
            className="w-full py-2.5 bg-primary text-primary-foreground rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <ArrowUp size={16} />
            {newPostCount} new post{newPostCount > 1 ? 's' : ''} — tap to refresh
          </motion.button>
        )}
      </AnimatePresence>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle size={18} />{error}</div>
          <button onClick={() => fetchPosts()} className="p-2 hover:bg-destructive/20 rounded-lg transition-colors"><RefreshCw size={18} /></button>
        </div>
      )}

      <AnimatePresence>
        {posts.map((post, idx) => (
          <motion.div key={post.id || post._id || idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(idx * 0.05, 0.5) }}>
            <PostCard post={post} onLikeUpdate={() => fetchPosts(pagination?.page || 1, true)} />
          </motion.div>
        ))}
      </AnimatePresence>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 py-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
            <button key={pageNum} onClick={() => fetchPosts(pageNum)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${pagination.page === pageNum ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80'}`}>
              {pageNum}
            </button>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="text-center py-20 bg-accent/20 rounded-2xl border-2 border-dashed border-border/50">
          <p className="text-muted-foreground text-lg mb-4">No posts yet. Start by connecting with others!</p>
          <button onClick={() => navigate('/discovery')} className="bg-primary px-6 py-2 rounded-xl font-bold">Discover People</button>
        </div>
      )}
    </div>
  );
};

export default Feed;
