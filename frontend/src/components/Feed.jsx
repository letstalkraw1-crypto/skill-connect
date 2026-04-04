import React, { useState, useEffect } from 'react';
import PostCard from './PostCard';
import { postService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data } = await postService.getFeed();
      setPosts(data);
    } catch (err) {
      setError('Failed to load feed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  if (loading && !posts.length) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-6 rounded-2xl animate-pulse">
            <div className="flex gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-accent"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 w-1/4 bg-accent rounded"></div>
                <div className="h-3 w-1/6 bg-accent rounded"></div>
              </div>
            </div>
            <div className="h-20 w-full bg-accent rounded-xl"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
          </div>
          <button onClick={fetchPosts} className="p-2 hover:bg-destructive/20 rounded-lg transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {posts.map((post, idx) => (
          <motion.div
            key={post._id || idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <PostCard post={post} onLikeUpdate={fetchPosts} />
          </motion.div>
        ))}
      </AnimatePresence>

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
