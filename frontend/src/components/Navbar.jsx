import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Search, MessageSquare, User, LogOut, Plus, Calendar, Users, X, Video, Mic2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import Avatar from './Avatar';
import CreateModal from './CreateModal';
import api from '../services/api';

const NavItem = ({ to, icon: Icon, label, active }) => (
  <Link
    to={to}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
      active
        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
        : 'hover:bg-accent text-muted-foreground hover:text-foreground'
    }`}
  >
    <Icon size={20} />
    <span className="hidden md:inline font-medium">{label}</span>
  </Link>
);

const Navbar = () => {
  const { user, logout } = useAuth();
  const [showCreate, setShowCreate] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searching, setSearching] = React.useState(false);
  const searchRef = React.useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Debounced search
  React.useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/discover/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(Array.isArray(data) ? data : []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 transition-transform hover:scale-105">
            <img
              src="/logo.png"
              alt="Collabro Logo"
              className="h-8 w-8 object-contain"
              fetchpriority="high"
              loading="eager"
            />
            <span className="text-xl font-bold tracking-tight hidden sm:inline">Collabro</span>
          </Link>

          <div className="hidden md:flex items-center gap-2 ml-8 flex-1">
            <NavItem to="/" icon={Home} label="Home" active={location.pathname === '/'} />
            <NavItem to="/daily-challenge" icon={Mic2} label="Daily Challenge" active={location.pathname.startsWith('/daily-challenge')} />
            <NavItem to="/discovery" icon={Search} label="Discover" active={location.pathname.startsWith('/discovery')} />
            <NavItem to="/chat" icon={MessageSquare} label="Messages" active={location.pathname.startsWith('/chat')} />
            <NavItem to={`/profile/${user._id || user.id}`} icon={User} label="Profile" active={location.pathname.startsWith('/profile')} />
          </div>

          <div className="flex items-center gap-2">
            <Link to="/webinar"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${location.pathname === '/webinar' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
              <Video size={16} /> Webinar
            </Link>

            {/* Search */}
            <div className="relative" ref={searchRef}>
              <button
                onClick={() => { setShowSearch(s => !s); setTimeout(() => document.getElementById('global-search')?.focus(), 100); }}
                className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                title="Search"
              >
                <Search size={20} />
              </button>
              <AnimatePresence>
                {showSearch && (
                  <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    className="fixed sm:absolute top-16 sm:top-full left-0 sm:left-auto right-0 sm:right-0 sm:mt-2 w-full sm:w-80 glass-card sm:rounded-2xl border-b sm:border border-border shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center gap-2 p-3 border-b border-border">
                      <Search size={16} className="text-muted-foreground flex-shrink-0" />
                      <input id="global-search" type="text" placeholder="Search users, events, communities..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm" autoComplete="off" />
                      {searchQuery && <button onClick={() => { setSearchQuery(''); setSearchResults([]); }}><X size={14} className="text-muted-foreground" /></button>}
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {searching ? (
                        <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">Searching...</div>
                      ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                        <div className="py-6 text-center text-xs text-muted-foreground">No results found</div>
                      ) : searchResults.map((r, i) => (
                        <button key={r._id || r.id || i} onClick={() => { navigate(`/profile/${r._id || r.id}`); setShowSearch(false); setSearchQuery(''); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left">
                          <Avatar src={r.avatarUrl} name={r.name} size="10" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{r.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.skills?.map(s => s.skillName || s.name).join(', ') || r.location || ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* + Create Button */}
            <button onClick={() => setShowCreate(true)}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
              title="Create Event or Community">
              <Plus size={22} />
            </button>

            <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block"></div>

            <button onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
              <LogOut size={18} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
