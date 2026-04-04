import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Video, Link as LinkIcon, Send, X } from 'lucide-react';
import { postService } from '../services/api';

const CreatePost = ({ onPostCreated }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [caption, setCaption] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages([...images, ...files]);
    
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);

    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]);
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!caption.trim() && images.length === 0) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('caption', caption);
      images.forEach(image => formData.append('images', image));

      await postService.createPost(formData);
      setCaption('');
      setImages([]);
      setPreviews([]);
      setIsExpanded(false);
      if (onPostCreated) onPostCreated();
    } catch (err) {
      console.error(err);
      alert('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-4 rounded-2xl mb-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex-shrink-0"></div>
          <textarea
            placeholder="Share what you're working on or ask for help..."
            className="flex-1 bg-transparent border-none outline-none resize-none text-foreground py-2 h-auto min-h-[40px] max-h-[200px]"
            value={caption}
            onFocus={() => setIsExpanded(true)}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden space-y-4"
            >
              {previews.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-2">
                  {previews.map((preview, idx) => (
                    <div key={idx} className="relative h-24 w-24 flex-shrink-0 group">
                      <img src={preview} alt="preview" className="h-full w-full object-cover rounded-xl border border-border" />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 h-6 w-6 bg-destructive/80 text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors">
                    <Image size={18} className="text-primary" />
                    <span className="hidden sm:inline">Image</span>
                    <input type="file" multiply accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                  <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <Video size={18} className="text-purple-500" />
                    <span className="hidden sm:inline">Video</span>
                  </button>
                  <button type="button" className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                    <LinkIcon size={18} className="text-emerald-500" />
                    <span className="hidden sm:inline">Link</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || (!caption.trim() && images.length === 0)}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Send size={18} />
                      Post
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
};

export default CreatePost;
