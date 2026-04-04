import React, { useState } from 'react';
import { Heart, MessageSquare, Share2, MoreVertical, Trash2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { postService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const PostCard = ({ post, onLikeUpdate }) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(post.is_liked || post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes_count || post.likeCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  const handleLike = async () => {
    try {
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
      await postService.likePost(post.id || post._id);
      if (onLikeUpdate) onLikeUpdate();
    } catch (err) {
      console.error(err);
      // Rollback on error
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    }
  };

  const fetchComments = async () => {
    if (!showComments) {
      setLoadingComments(true);
      try {
        const { data } = await postService.getComments(post.id || post._id);
        setComments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const { data } = await postService.addComment(post.id || post._id, commentText);
      setComments([...comments, data]);
      setCommentText('');
    } catch (err) {
      console.error(err);
      alert('Failed to add comment');
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden mb-6">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            onClick={() => window.location.href=`/profile/${post.author_id || post.userId?._id}`}
            className="h-10 w-10 rounded-xl bg-primary/20 p-0.5 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          >
            <img 
              src={post.author_avatar || post.authorAvatar || '/logo.png'} 
              className="h-full w-full object-cover rounded-lg" 
              alt={post.author_name}
            />
          </div>
          <div>
            <h3 
              onClick={() => window.location.href=`/profile/${post.author_id || post.userId?._id}`}
              className="font-bold text-sm cursor-pointer hover:text-primary transition-colors"
            >
              {post.author_name || post.authorName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(post.createdAt || post.created_at))} ago
            </p>
          </div>
        </div>
        <button className="p-2 hover:bg-accent rounded-lg transition-colors">
          <MoreVertical size={18} className="text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 pb-4">
        {post.caption && <p className="text-sm whitespace-pre-wrap mb-4">{post.caption}</p>}
        
        {post.image_urls?.length > 0 ? (
          <div className={`grid gap-2 ${post.image_urls.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {post.image_urls.map((url, idx) => (
              <img key={idx} src={url} className="w-full h-auto max-h-[500px] object-cover rounded-xl border border-border/50" alt="post" />
            ))}
          </div>
        ) : post.imageUrl ? (
          <img src={post.imageUrl} className="w-full h-auto max-h-[500px] object-cover rounded-xl border border-border/50" alt="post" />
        ) : null}
      </div>

      <div className="px-4 py-3 flex items-center justify-between border-t border-border/50">
        <div className="flex gap-4">
          <button 
            onClick={handleLike}
            className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'}`}
          >
            <motion.div animate={{ scale: isLiked ? [1, 1.3, 1] : 1 }}>
              <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
            </motion.div>
            <span className="text-sm font-bold">{likeCount}</span>
          </button>
          <button 
            onClick={fetchComments}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors"
          >
            <MessageSquare size={20} />
            <span className="text-sm font-bold">{post.comments_count || comments.length}</span>
          </button>
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-emerald-500 transition-colors">
            <Share2 size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 bg-accent/10 px-4 py-4"
          >
            <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-2">No comments yet. Be the first to comment!</p>
              ) : (
                comments.map((comment, idx) => (
                  <div key={idx} className="flex gap-3">
                    <img src={comment.authorAvatar || '/logo.png'} className="h-8 w-8 rounded-lg object-cover" />
                    <div className="flex-1 bg-background/50 rounded-xl p-2 border border-border/30">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs">{comment.authorName}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt))} ago
                        </span>
                      </div>
                      <p className="text-sm">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Write a comment..." 
                className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button 
                type="submit" 
                disabled={!commentText.trim()}
                className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostCard;
