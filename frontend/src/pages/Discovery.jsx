import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, MapPin, Check, UserPlus, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { discoveryService, connectionService } from '../services/api';
import { getAssetUrl } from '../utils/utils';
import DiscoverySkeleton from '../components/DiscoverySkeleton';

const Discovery = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, learn, collaborate, compete
  const [pagination, setPagination] = useState(null);
  const navigate = useNavigate();
  const [originalResults, setOriginalResults] = useState([]);

  const handleSearch = async (e, page = 1) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;
    setLoading(true);
    try {
      const { data } = await discoveryService.search(searchTerm, page);
      if (data.docs) {
        setResults(data.docs);
        setOriginalResults(data.docs);
        setPagination({
          page: data.page,
          totalPages: data.totalPages,
          totalDocs: data.totalDocs
        });
      } else {
        setResults(data);
        setOriginalResults(data);
      }
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

  const fetchSuggestions = async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await discoveryService.getSuggestions(page);
      if (data.docs) {
        setResults(data.docs);
        setOriginalResults(data.docs);
        setPagination({
          page: data.page,
          totalPages: data.totalPages,
          totalDocs: data.totalDocs
        });
      } else {
        setResults(data);
        setOriginalResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (filterType === 'all') {
      setResults(originalResults);
    } else {
      setResults(originalResults.filter(r => r.lookingFor === filterType));
    }
  }, [filterType, originalResults]);

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
        <div className="flex gap-2 p-1 relative">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl transition-colors ${showFilters ? 'bg-primary text-primary-foreground' : 'bg-accent hover:bg-accent/80'}`}
          >
            <Filter size={18} />
            <span>{filterType === 'all' ? 'Filters' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}</span>
          </button>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full right-0 mt-2 w-48 glass-card p-2 rounded-xl border border-border z-20 shadow-xl"
              >
                {['all', 'learn', 'collaborate', 'compete'].map((t) => (
                  <button
                    key={t}
                    onClick={() => { setFilterType(t); setShowFilters(false); }}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === t ? 'bg-primary/20 text-primary' : 'hover:bg-accent'}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

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
              <DiscoverySkeleton key={idx} />
            ))
          ) : results.length === 0 ? (
// ... rest of empty state ...
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
// ... rest of map ...
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
                      src={getAssetUrl(person.avatarUrl || person.avatar_url)} 
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
                      onClick={() => navigate(`/chat/${person.id || person._id}`)}
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

        {pagination && pagination.totalPages > 1 && (
          <div className="col-span-full flex justify-center gap-2 py-8">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(pageNum => (
              <button
                key={pageNum}
                onClick={() => searchTerm ? handleSearch(null, pageNum) : fetchSuggestions(pageNum)}
                className={`h-10 w-10 rounded-xl text-sm font-bold transition-all ${
                  pagination.page === pageNum 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                    : 'bg-accent hover:bg-accent/80 shadow-sm'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Discovery;
