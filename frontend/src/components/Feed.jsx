import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postService } from '../services/api';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, RefreshCw } from 'lucide-react';
import PostCard from './PostCard';
import PostSkeleton from './PostSkeleton';


const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();

  const fetchPosts = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await postService.getFeed(page);
      // Backend now returns { docs, totalDocs, page, totalPages }
      if (data.docs) {
        setPosts(data.docs);
        setPagination({
          page: data.page,
          totalPages: data.totalPages,
          totalDocs: data.totalDocs
        });
      } else {
        setPosts(data);
      }
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
        {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
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
          <button onClick={() => fetchPosts()} className="p-2 hover:bg-destructive/20 rounded-lg transition-colors">
            <RefreshCw size={18} />
          </button>
        </div>
      )}

      <AnimatePresence>
        {posts.map((post, idx) => (
          <motion.div
            key={post.id || post._id || idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: Math.min(idx * 0.05, 0.5) }}
          >
            <PostCard post={post} onLikeUpdate={() => fetchPosts(pagination?.page || 1)} />
          </motion.div>
        ))}
      </AnimatePresence>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 py-4">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => fetchPosts(pageNum)}
              className={`h-8 w-8 rounded-lg text-xs font-bold transition-all ${
                pagination.page === pageNum 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-accent hover:bg-accent/80'
              }`}
            >
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
