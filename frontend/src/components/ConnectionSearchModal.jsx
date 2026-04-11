import { X, Search, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import { userService, connectionService } from '../services/api';

const ConnectionSearchModal = ({ isOpen, onClose, onConnectionSent }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectionStates, setConnectionStates] = useState({});

  const performSearch = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await userService.searchUsers(query);
      setSearchResults(data.users || []);
      
      const states = {};
      (data.users || []).forEach(user => {
        states[user._id] = user.connectionStatus || 'none';
      });
      setConnectionStates(states);
    } catch (err) {
      setError(err.response?.data?.error || 'Search failed. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  const handleConnect = async (userId) => {
    if (connectionStates[userId] !== 'none') return;

    try {
      setConnectionStates(prev => ({ ...prev, [userId]: 'sending' }));
      await connectionService.sendRequest(userId);
      setConnectionStates(prev => ({ ...prev, [userId]: 'pending' }));
      if (onConnectionSent) onConnectionSent(userId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request');
      setConnectionStates(prev => ({ ...prev, [userId]: 'none' }));
    }
  };

  const getButtonContent = (userId) => {
    const state = connectionStates[userId];
    if (state === 'sending') return <Loader2 className="w-4 h-4 animate-spin" />;
    if (state === 'connected') return 'Connected';
    if (state === 'pending') return 'Request Sent';
    return 'Connect';
  };

  const isButtonDisabled = (userId) => {
    const state = connectionStates[userId];
    return state !== 'none';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-background border border-border rounded-2xl w-full max-w-lg max-h-[80vh] md:max-h-[600px] flex flex-col overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold text-foreground">Search Users</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, user ID, or profile URL"
                className="w-full pl-10 pr-4 py-3 bg-accent/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="text-center py-8 text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && searchQuery.length < 2 && (
              <div className="text-center py-8 text-muted-foreground">
                Enter at least 2 characters to search
              </div>
            )}

            {!loading && !error && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found
              </div>
            )}

            {!loading && !error && searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <motion.div
                    key={user._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-3 bg-accent/30 hover:bg-accent/50 rounded-xl transition-colors"
                  >
                    <Avatar src={user.avatarUrl} name={user.name} size="12" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-foreground truncate">{user.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">@{user.shortId}</p>
                      {user.location && (
                        <p className="text-xs text-muted-foreground truncate">{user.location}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleConnect(user._id)}
                      disabled={isButtonDisabled(user._id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all min-w-[100px] ${
                        isButtonDisabled(user._id)
                          ? 'bg-accent text-muted-foreground cursor-not-allowed'
                          : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      }`}
                    >
                      {getButtonContent(user._id)}
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConnectionSearchModal;
