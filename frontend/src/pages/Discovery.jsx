import React, { useState, useEffect } from 'react';
import { discoveryService, connectionService } from '../services/api';
import { Search, MapPin, UserPlus, Check, MessageCircle, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Discovery = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const { data } = await discoveryService.search(searchTerm);
      setResults(data);
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
      setResults(results.map(r => r._id === targetUserId || r.id === targetUserId ? { ...r, connectionStatus: 'pending' } : r));
    } catch (err) {
      console.error(err);
      alert('Failed to send request');
    } finally {
      setConnecting(null);
    }
  };

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await discoveryService.getSuggestions();
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Discover Your Next Collaboration
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Find skilled individuals, local events, and vibrant communities to grow your skills.
        </p>
      </div>

      <div className="glass-card p-2 rounded-2xl flex flex-col md:flex-row gap-2">
        <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 px-4 py-2">
          <Search size={20} className="text-muted-foreground" />
          <input
            type="text"
            placeholder="Search for skills, names, or events..."
            className="flex-1 bg-transparent border-none outline-none text-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>
        <div className="flex gap-2 p-1">
          <button className="flex items-center gap-2 px-6 py-2 rounded-xl bg-accent hover:bg-accent/80 transition-colors">
            <Filter size={18} />
            <span>Filters</span>
          </button>
          <button 
            onClick={handleSearch}
            className="flex items-center gap-2 px-8 py-2 rounded-xl bg-primary text-primary-foreground font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Search
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="glass-card h-[280px] rounded-2xl animate-pulse bg-accent/20" />
            ))
          ) : results.length === 0 ? (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="text-muted-foreground">No matches found for "{searchTerm}"</div>
              <button 
                onClick={() => { setSearchTerm(''); fetchSuggestions(); }}
                className="text-primary hover:underline"
              >
                Clear search and view suggestions
              </button>
            </div>
          ) : (
            results.map((person, idx) => (
              <motion.div
                key={person.id || person._id || idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-6 rounded-2xl hover:border-primary/50 transition-all group overflow-hidden relative"
              >
                {/* Background Glow */}
                <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all"></div>
                
                <div className="flex gap-4 mb-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 p-0.5 border border-border group-hover:border-primary transition-all">
                    <img 
                      src={person.avatarUrl || person.avatar_url || '/logo.png'} 
                      className="h-full w-full object-cover rounded-xl"
                      alt={person.name} 
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{person.name}</h3>
                    <div className="flex items-center gap-1 text-muted-foreground mt-1 text-sm">
                      <MapPin size={14} />
                      <span>{person.location || 'Coimbatore'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {person.skills?.slice(0, 3).map((skill, sIdx) => (
                      <span key={sIdx} className="px-2 py-1 rounded-lg bg-accent/50 text-[10px] font-bold uppercase tracking-wider">
                        {skill.name || skill.skillName}
                      </span>
                    ))}
                    {person.skills?.length > 3 && (
                      <span className="px-2 py-1 rounded-lg bg-accent/50 text-[10px] font-bold">+{person.skills.length - 3} more</span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      disabled={person.connectionStatus === 'pending' || connecting === (person.id || person._id)}
                      onClick={() => handleConnect(person.id || person._id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                        person.connectionStatus === 'pending'
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                          : 'bg-primary text-primary-foreground shadow-lg shadow-primary/10 hover:scale-[1.02] active:scale-95'
                      }`}
                    >
                      {person.connectionStatus === 'pending' ? (
                        <>
                          <Check size={18} />
                          Pending
                        </>
                      ) : connecting === (person.id || person._id) ? (
                        <div className="h-5 w-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <UserPlus size={18} />
                          Connect
                        </>
                      )}
                    </button>
                    <button 
                      onClick={() => window.location.href=`/chat/${person.id || person._id}`}
                      className="p-2.5 rounded-xl bg-accent text-foreground hover:bg-accent/80 transition-all border border-border"
                    >
                      <MessageCircle size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Discovery;
