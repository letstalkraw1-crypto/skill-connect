import React, { useState, useEffect } from 'react';
import { discoveryService, connectionService } from '../services/api';
import { UserPlus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import DiscoverySkeleton from './DiscoverySkeleton';

const Suggestions = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);

  const fetchSuggestions = async () => {
    try {
      const { data } = await discoveryService.getSuggestions(1, 5);
      setSuggestions(data.docs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (targetUserId) => {
    setConnecting(targetUserId);
    try {
      await connectionService.sendRequest(targetUserId);
      setSuggestions(suggestions.map(s => s._id === targetUserId ? { ...s, connectionStatus: 'pending' } : s));
    } catch (err) {
      console.error(err);
    } finally {
      setConnecting(null);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  if (loading && !suggestions.length) {
    return (
      <div className="glass-card p-6 rounded-2xl">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Recommended for you</h2>
        <DiscoverySkeleton count={3} />
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Recommended for you</h2>
      <div className="space-y-4">
        <AnimatePresence>
          {suggestions.map((person, idx) => (
            <motion.div
              key={person.id || idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-center justify-between gap-3 group"
            >
              <div 
                onClick={() => window.location.href=`/profile/${person.id}`}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Avatar src={person.avatarUrl} name={person.name} size="10" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate group-hover:text-primary transition-colors">{person.name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{person.location || 'Coimbatore'}</p>
                </div>
              </div>
              <button
                disabled={person.connectionStatus === 'pending' || connecting === person.id}
                onClick={() => handleConnect(person.id)}
                className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all ${
                  person.connectionStatus === 'pending'
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20'
                }`}
              >
                {person.connectionStatus === 'pending' ? <Check size={16} /> : <UserPlus size={16} />}
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <button 
        onClick={() => window.location.href='/discovery'}
        className="w-full mt-6 py-2 rounded-xl text-xs font-bold text-primary hover:bg-primary/10 transition-colors border border-transparent hover:border-primary/20"
      >
        View More
      </button>
    </div>
  );
};

export default Suggestions;
