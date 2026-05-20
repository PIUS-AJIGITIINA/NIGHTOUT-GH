import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Calendar, Clock, ExternalLink, Ticket, Filter, Play, Plus, Map, Share2, Youtube, Flame, Check, Star, MessageSquare, Trash2, X, Bookmark } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EventItem, Review } from './types';

// Utility for merging tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LOADING_MESSAGES = [
  "Scanning the streets of Accra... 👀",
  "Checking what's popping in Kumasi... 🔥",
  "Digging through the gram... 📸",
  "Securing the VIP sections... 🍾",
  "Looking for the best vibes... 🎵"
];

const EVENT_IMAGES = {
  concert: [
    'https://images.unsplash.com/photo-1540039155732-d674d0e80062?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1470229722913-7c092db62220?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&q=80&w=800'
  ],
  party: [
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1533174000220-4b4116bb9a33?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=800'
  ],
  tech: [
    'https://images.unsplash.com/photo-1540317580384-e5d43867caa6?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1559223607-a43c990c692c?auto=format&fit=crop&q=80&w=800'
  ],
  culture: [
    'https://images.unsplash.com/photo-1542820229-081e0c12af0b?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1520262454473-a1a82276a574?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&q=80&w=800'
  ],
  comedy: [
    'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1527224857830-43a7eea85e4e?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1507676184212-d0330a15168b?auto=format&fit=crop&q=80&w=800'
  ]
};

function getImagesForEvent(event: EventItem): string[] {
  const text = `${event.name} ${event.category} ${event.description}`.toLowerCase();
  
  if (text.includes('tech') || text.includes('startup') || text.includes('hackathon') || text.includes('business') || text.includes('conference')) {
    return EVENT_IMAGES.tech;
  }
  if (text.includes('comedy') || text.includes('laugh') || text.includes('jokes')) {
    return EVENT_IMAGES.comedy;
  }
  if (text.includes('culture') || text.includes('art') || text.includes('food') || text.includes('beach') || text.includes('africa')) {
    return EVENT_IMAGES.culture;
  }
  if (text.includes('party') || text.includes('club') || text.includes('dj') || text.includes('rave')) {
    return EVENT_IMAGES.party;
  }
  
  // Default to concert/festival which look generally good and vibrant
  return EVENT_IMAGES.concert;
}

function getSpecificImage(event: EventItem): string {
  let seedId = 0;
  const seedString = (event.id || '') + (event.name || '');
  for (let i = 0; i < seedString.length; i++) {
    seedId = (seedId * 31 + seedString.charCodeAt(i)) >>> 0;
  }
  
  const pool = getImagesForEvent(event);
  return pool[seedId % pool.length];
}

function EventImage({ event }: { event: EventItem }) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);

  useEffect(() => {
    if (event.coverImage && typeof event.coverImage === 'string' && event.coverImage.trim() !== '' && event.coverImage !== 'null') {
      setImgSrc(event.coverImage);
    } else {
      setImgSrc(getSpecificImage(event));
    }
  }, [event.coverImage, event.id, event.name]);

  const handleError = () => {
    // If cover image fails, map to our fallback pool
    if (imgSrc === event.coverImage) {
       setImgSrc(getSpecificImage(event));
    } else {
       // If even the fallback fails... show generic
       setImgSrc(null);
    }
  };

  if (!imgSrc) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#FF6B00]/20 to-[#FFD700]/10">
        <Flame className="w-12 h-12 mb-2 text-[#FFD700]/30" />
        <span className="text-white/40 font-bold uppercase tracking-widest text-[10px] text-center px-4 line-clamp-2">{event.category || 'Event'}</span>
      </div>
    );
  }

  return (
    <img 
      loading="lazy"
      src={imgSrc} 
      alt={event.name || 'Event'} 
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
      onError={handleError}
      referrerPolicy="no-referrer"
    />
  );
}

function Badge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'gold' | 'outline' }) {
  return (
    <span className={cn(
      "px-2 py-1 text-xs font-semibold rounded-md tracking-wide",
      {
        'bg-gh-black-light text-white border border-white/10': variant === 'default',
        'bg-gradient-to-r from-red-500 to-gh-orange text-gh-black': variant === 'gold',
        'border border-gh-orange text-gh-orange': variant === 'outline',
      },
      className
    )}>
      {children}
    </span>
  );
}

export default function App() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessageIdx, setLoadingMessageIdx] = useState(0);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [isScanningBackend, setIsScanningBackend] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const [cityFilter, setCityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [sortOption, setSortOption] = useState<'DateAsc' | 'Recent'>('DateAsc');

  // Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [googleImporting, setGoogleImporting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Bookmarks
  const [savedEventIds, setSavedEventIds] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('nightout_saved') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('nightout_saved', JSON.stringify(savedEventIds));
  }, [savedEventIds]);

  const toggleBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSavedEventIds(prev => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  // Reviews State
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  const [reviewModalEventId, setReviewModalEventId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);

  // Community Submitted State (would be a real DB in prod)
  const [communityEvents, setCommunityEvents] = useState<EventItem[]>([
    {
      id: 'comm_init_1',
      name: 'Detty December: Afro Future 2026',
      date: '2026-12-27',
      time: '18:00',
      venue: 'El-Wak Stadium',
      city: 'Accra',
      category: 'Festival',
      price: 'GHS 250 - 1000',
      description: 'The biggest celebration of African culture and music is back. Get ready for the energy!',
      sourceLink: 'https://instagram.com',
      sourcePlatform: 'User Submitted',
      isCommunitySubmitted: true,
      isPromoted: true,
      coverImage: 'https://images.unsplash.com/photo-1540039155732-d674d0e80062?auto=format&fit=crop&q=80&w=800'
    }
  ]);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (loading) {
      interval = setInterval(() => {
        setLoadingMessageIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const fetchEvents = async () => {
    setLoading(true);
    setErrorLogs([]);
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
        
        // Parse cache metadata errors
        if (data.errors) {
           let eList: string[] = [];
           if (Array.isArray(data.errors)) {
               eList = data.errors;
           } else if (typeof data.errors === 'object') {
               eList = Object.entries(data.errors).map(([src, msg]) => `${src}: ${msg}`);
           }
           if (eList.length > 0) setErrorLogs(eList);
        }
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setErrorLogs(['Network error fetching baseline events']);
    } finally {
      setLoading(false);
    }
  };

  const scanForMoreEvents = async () => {
    setIsScanningBackend(true);
    showToast("Starting deep scan... This may take a minute.", 'success');
    try {
      const res = await fetch('/api/scan', { method: 'POST' });
      if (res.ok) {
        // Backend now awaits the scan completion on serverless
        fetchEvents();
        setIsScanningBackend(false);
        showToast("Scan completed successfully.", 'success');
      } else {
        showToast("Scan already in progress or failed.", 'error');
        setIsScanningBackend(false);
      }
    } catch(err) {
      setIsScanningBackend(false);
      showToast("Failed to start scan", 'error');
    }
  };

  const handleRemoveEvent = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to remove this event?")) return;
    
    // Optimistic UI update
    setEvents(prev => prev.filter(ev => ev.id !== id));
    setCommunityEvents(prev => prev.filter(ev => ev.id !== id));
    
    try {
      await fetch(`/api/events/${id}`, { method: 'DELETE' });
      // Optionally refetch to be sure
      // fetchEvents();
    } catch (err) {
      console.error('Failed to remove event:', err);
    }
  };

  const allEvents = useMemo(() => {
    return [...communityEvents, ...events];
  }, [events, communityEvents]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Free text search
      const matchesSearch = !debouncedSearchQuery || 
        ev.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) || 
        ev.venue.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      
      // City
      const matchesCity = cityFilter === 'All' || 
        (ev.city && ev.city.toLowerCase().includes(cityFilter.toLowerCase()));
      
      // Category
      const matchesCategory = categoryFilter === 'All' || 
        ev.category.toLowerCase() === categoryFilter.toLowerCase();
      
      // Date Filter (Simulated logic for 'This Weekend' / 'This Month')
      let matchesDate = true;
      if (dateFilter !== 'All') {
        const evDate = new Date(ev.date);
        const today = new Date();
        const diffMs = evDate.getTime() - today.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        
        if (dateFilter === 'This Weekend') {
          // Naive check: within next 7 days and is a Fri/Sat/Sun
          const day = evDate.getDay();
          matchesDate = diffDays >= 0 && diffDays <= 7 && (day === 0 || day === 5 || day === 6);
        } else if (dateFilter === 'This Month') {
          matchesDate = evDate.getMonth() === today.getMonth() && evDate.getFullYear() === today.getFullYear();
        }
      }

      return matchesSearch && matchesCity && matchesCategory && matchesDate;
    }).sort((a, b) => {
      if (sortOption === 'DateAsc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        // Fallback to importedAt or just id as proxy for recent if importedAt not on EventItem type originally
        // Since we didn't add importedAt universally, let's sort by ID descending (which has timestamp for comm_)
        // For real app we should use importedAt
        return b.id.localeCompare(a.id);
      }
    });
  }, [allEvents, debouncedSearchQuery, cityFilter, categoryFilter, dateFilter, sortOption]);

  const handleCommunitySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const getBase64 = (file: File | null): Promise<string> => new Promise((resolve) => {
      if (!file || file.size === 0) return resolve('');
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const file = formData.get('coverImage') as File | null;
    const coverImageBase64 = await getBase64(file);

    const newEvent: EventItem = {
      id: `comm_${Date.now()}`,
      name: formData.get('name') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      venue: formData.get('venue') as string,
      city: formData.get('city') as string,
      category: formData.get('category') as string,
      price: formData.get('price') as string,
      description: formData.get('description') as string,
      sourceLink: formData.get('sourceLink') as string,
      sourcePlatform: 'Community',
      isCommunitySubmitted: true,
      coverImage: coverImageBase64,
    };
    
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newEvent),
      });
      fetchEvents();
    } catch(err) {
      console.error(err);
      setCommunityEvents([newEvent, ...communityEvents]);
    }
    setIsSubmitModalOpen(false);
  };

  return (
    <div className="min-h-screen text-white selection:bg-gh-orange selection:text-white pb-20">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={cn(
              "fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full border shadow-xl flex items-center gap-3 backdrop-blur-md",
              toast.type === 'error' ? "bg-red-950/80 border-red-500/50 text-red-200" : "bg-gh-black/80 border-gh-gold/50 text-gh-gold"
            )}
          >
            {toast.type === 'error' ? <X className="w-5 h-5 flex-shrink-0" /> : <Check className="w-5 h-5 flex-shrink-0" />}
            <span className="font-medium text-sm whitespace-nowrap">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="sticky top-0 z-40 bg-gh-black/90 backdrop-blur-md border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:h-20 py-4 sm:py-0 gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSearchQuery(''); fetchEvents(); }}>
              <motion.div 
                whileHover={{ rotate: 90 }}
                transition={{ type: "spring", stiffness: 200, damping: 10 }}
                className="w-10 h-10 bg-gh-orange text-gh-black flex items-center justify-center font-display text-2xl font-black rounded-sm shadow-lg shadow-gh-orange/20"
              >
                N
              </motion.div>
              <h1 className="text-3xl font-display leading-none">
                <span className="text-white">NIGHTOUT</span><span className="text-gh-orange">.</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                <input 
                  type="text" 
                  placeholder="Find events, venues..." 
                  className="w-full bg-gh-black-light border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-gh-orange focus:ring-1 focus:ring-gh-orange transition-all placeholder:text-white/30"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={scanForMoreEvents}
                disabled={isScanningBackend}
                className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-2 rounded-full font-medium transition-colors border border-white/10 text-sm whitespace-nowrap disabled:opacity-50"
              >
                {isScanningBackend ? 'Scanning...' : 'Scan New Events'}
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsContactModalOpen(true)}
                className="hidden sm:flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-2 rounded-full font-medium transition-colors border border-white/10 text-sm whitespace-nowrap"
              >
                Contact
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => {
                  setGoogleImporting(true);
                  try {
                    const res = await fetch('/api/events/google', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({}) // Completely autonomous
                    });
                    if (res.ok) {
                      fetchEvents();
                      showToast("Event auto-discovered successfully", 'success');
                    } else {
                      const data = await res.json();
                      showToast("Failed to auto-discover: " + (data.error || "Unknown error"), 'error');
                    }
                  } catch(err) {
                    showToast("Failed to reach server", 'error');
                  } finally {
                    setGoogleImporting(false);
                  }
                }}
                disabled={googleImporting}
                className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white px-4 py-2 rounded-full font-medium transition-colors text-sm whitespace-nowrap shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <span>{googleImporting ? 'Discovering...' : 'Auto-Discover Event 🔍'}</span>
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsSubmitModalOpen(true)}
                className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gh-gold border border-gh-gold px-4 py-2 rounded-full featured-badge hover:bg-gh-gold/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>PROMOTE YOUR EVENT</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <motion.div 
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        transition={{ delay: 0.2 }}
        className="bg-gh-gold text-gh-black px-4 sm:px-8 py-2 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gh-gold/20 shrink-0 gap-2 overflow-hidden"
      >
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wide">
          <motion.span 
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-2 h-2 bg-gh-orange rounded-full"
          ></motion.span>
          <span>Scanning {cityFilter === 'All' ? 'all regions' : cityFilter}...</span>
        </div>
        <div className="flex gap-4 text-[11px] font-mono opacity-80 uppercase tracking-wider font-semibold">
          <span>{filteredEvents.length} events found</span>
        </div>
      </motion.div>

      {/* Massive Editorial Hero */}
      {!loading && (
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 border-b border-white/5 mb-8"
        >
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[clamp(3rem,8vw,8rem)] leading-[0.85] font-display text-white drop-shadow-2xl z-10 pb-4"
          >
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >GHANA IS</motion.span><br />
            <motion.span
               animate={{ scale: [1, 1.05, 1], filter: ["var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow) hue-rotate(0deg)", "var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow) hue-rotate(15deg)", "var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow) hue-rotate(0deg)"] }}
               transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
               className="inline-block text-gh-orange italic pr-4 drop-shadow-[0_0_15px_rgba(255,90,31,0.6)]"
            >ALIVE</motion.span> 
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", delay: 1.5 }}
            >TONIGHT.</motion.span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="max-w-2xl text-gh-muted text-lg mt-8 font-medium"
          >
            Curated events from across the country. From massive festivals in <span className="text-gh-gold">Accra</span> to intimate campus parties in <span className="text-gh-gold">Kumasi</span>. Finding the vibe has never been easier.
          </motion.p>
        </motion.div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Filters */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center gap-4 mb-8 p-4 glass rounded-2xl"
        >
          <div className="flex items-center gap-2 text-gh-muted mr-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium uppercase tracking-wider">Filters</span>
          </div>
          
          <select 
            className="bg-gh-black border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:border-gh-orange outline-none"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
          >
            <option value="All">All Regions</option>
            <option value="Ahafo">Ahafo</option>
            <option value="Ashanti">Ashanti</option>
            <option value="Bono">Bono</option>
            <option value="Bono East">Bono East</option>
            <option value="Central">Central</option>
            <option value="Eastern">Eastern</option>
            <option value="Greater Accra">Greater Accra</option>
            <option value="North East">North East</option>
            <option value="Northern">Northern</option>
            <option value="Oti">Oti</option>
            <option value="Savannah">Savannah</option>
            <option value="Upper East">Upper East</option>
            <option value="Upper West">Upper West</option>
            <option value="Volta">Volta</option>
            <option value="Western">Western</option>
            <option value="Western North">Western North</option>
          </select>
          
          <select 
            className="bg-gh-black border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:border-gh-gold outline-none cursor-pointer"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Vibes</option>
            <option value="Concert">Concerts 🎤</option>
            <option value="Party">Parties 🥳</option>
            <option value="Campus">Campus 🔥</option>
            <option value="Comedy">Comedy 😂</option>
            <option value="Festival">Festivals 🎪</option>
          </select>

          <select 
            className="bg-gh-black border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:border-white/20 outline-none"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="All">Any Time</option>
            <option value="This Weekend">This Weekend</option>
            <option value="This Month">This Month</option>
          </select>

          <select 
            className="bg-gh-black border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:border-white/20 outline-none"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
          >
            <option value="DateAsc">Sort: Upcoming First</option>
            <option value="Recent">Sort: Recently Added</option>
          </select>

          <div className="flex-1"></div>
          
          <button 
            onClick={fetchEvents} 
            disabled={loading}
            className="text-sm text-gh-orange hover:text-white transition-colors underline underline-offset-4 decoration-gh-orange/50"
          >
            Refresh Events
          </button>
        </motion.div>

        {/* Status Indicators Removed */}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex flex-col gap-3">
                <div className="w-full aspect-[4/3] bg-gh-black-light rounded-2xl"></div>
                <div className="h-6 bg-gh-black-light rounded w-3/4"></div>
                <div className="h-4 bg-gh-black-light rounded w-1/2"></div>
                <div className="flex gap-2 mt-2">
                  <div className="h-6 w-16 bg-gh-black-light rounded-md"></div>
                  <div className="h-6 w-16 bg-gh-black-light rounded-md"></div>
                </div>
              </div>
            ))}
            <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
               <div className="w-12 h-12 border-4 border-white/10 border-t-gh-orange rounded-full animate-spin mb-4"></div>
               <p className="text-xl font-display text-white/80 animate-pulse">{LOADING_MESSAGES[loadingMessageIdx]}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredEvents.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-32 h-32 mb-6 opacity-30 grayscale mix-blend-screen bg-contain bg-center bg-no-repeat" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1470229722913-7c090be8bf49?w=400&q=80)' }} />
            <h3 className="text-2xl font-display text-white mb-2">Nothing popping here yet.</h3>
            <p className="text-gh-muted max-w-md">No events found for your current filters. Tap the plus button to add your own, or check back soon 👀</p>
            <button 
              onClick={() => { setCityFilter('All'); setCategoryFilter('All'); setDateFilter('All'); setSearchQuery(''); }}
              className="mt-6 px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Event Grid */}
        {!loading && filteredEvents.length > 0 && (
          <motion.div 
            className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } }
            }}
          >
            <AnimatePresence>
              {filteredEvents.map((ev) => (
                <motion.div 
                  key={ev.id}
                  layoutId={ev.id}
                  onClick={() => setSelectedEvent(ev)}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.95 },
                    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 25 } }
                  }}
                  whileHover={{ y: -8, scale: 1.02, transition: { duration: 0.2 } }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "group flex flex-col glass rounded-2xl overflow-hidden transition-all duration-300 break-inside-avoid cursor-pointer shadow-xl",
                    ev.isPromoted ? "card-gradient border-gh-gold shadow-2xl z-10" : "hover:bg-white/5 hover:shadow-2xl hover:shadow-gh-orange/10 border border-white/5 hover:border-white/20"
                  )}
                >
                  {/* Image / Cover */}
                  <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gh-black-light to-gh-black overflow-hidden">
                    <EventImage event={ev} />
                    {/* Overlays */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 shadow-lg">
                      {ev.isCommunitySubmitted && <Badge variant="gold" className="shadow-black/50 shadow-md">Community Choice ✨</Badge>}
                      {ev.isPromoted && <Badge variant="gold" className="shadow-black/50 shadow-md">Featured ⭐</Badge>}
                    </div>
                    
                    <div className="absolute top-3 right-3 flex gap-1">
                      <button 
                        onClick={(e) => toggleBookmark(e, ev.id)}
                        className={cn(
                          "bg-black/60 backdrop-blur-md p-1.5 rounded-lg border transition-colors z-20",
                          savedEventIds[ev.id] ? "border-gh-gold/50 text-gh-gold" : "border-white/10 text-white hover:bg-white/20 hover:text-white"
                        )}
                        title={savedEventIds[ev.id] ? "Remove Bookmark" : "Save Event"}
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleRemoveEvent(ev.id, e); }}
                        className="bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 hover:bg-red-500/80 transition-colors z-20"
                        title="Remove Event"
                      >
                        <Trash2 className="w-4 h-4 text-white/90" />
                      </button>
                      <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10 z-20">
                        {ev.sourcePlatform === 'YouTube' ? <Youtube className="w-4 h-4 text-red-500" /> : <Share2 className="w-4 h-4 text-white/80" />}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2 gap-2">
                       <h3 className="text-xl font-bold leading-tight line-clamp-2">{ev.name}</h3>
                    </div>

                    <div className="flex flex-col gap-2 text-sm text-gh-muted mb-4 mt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gh-orange/70" />
                        <span>{ev.date} {ev.time && `• ${ev.time}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gh-gold/70" />
                        <span className="line-clamp-1">{ev.venue}, <span className="text-white/90 font-medium">{ev.city}</span></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge>{ev.category}</Badge>
                      <Badge variant="outline">{ev.price}</Badge>
                    </div>

                    <p className="text-xs text-white/50 line-clamp-2 mb-4 flex-1">
                      {ev.description || "More details coming soon..."}
                    </p>

                    {/* Reviews snippet */}
                    {(() => {
                      const eventReviews = reviews[ev.id] || [];
                      const avgRating = eventReviews.length 
                        ? (eventReviews.reduce((acc, r) => acc + r.rating, 0) / eventReviews.length).toFixed(1)
                        : null;
                      return (
                        <div className="flex items-center justify-between mb-4 border-t border-white/5 pt-3">
                           <div className="flex items-center gap-1 group/rating relative cursor-pointer">
                             <Star className={cn("w-3.5 h-3.5", avgRating ? "text-gh-gold fill-gh-gold" : "text-white/20")} />
                             <span className="text-xs font-semibold">{avgRating ? `${avgRating} (${eventReviews.length})` : 'No reviews'}</span>
                             
                             {/* Tooltip for recent reviews */}
                             {eventReviews.length > 0 && (
                               <div className="absolute bottom-full left-0 mb-2 w-64 bg-gh-black border border-white/10 rounded-lg p-3 shadow-xl opacity-0 group-hover/rating:opacity-100 pointer-events-none transition-opacity z-20">
                                 <p className="text-[10px] font-bold text-gh-gold uppercase mb-2 border-b border-white/10 pb-1">Recent Reviews</p>
                                 <div className="space-y-2">
                                   {eventReviews.slice(0, 3).map(r => (
                                     <div key={r.id} className="text-xs">
                                       <div className="flex items-center justify-between">
                                         <span className="font-semibold text-white/90">{r.author}</span>
                                         <span className="text-gh-gold flex items-center"><Star className="w-2.5 h-2.5 fill-gh-gold mr-0.5"/>{r.rating}</span>
                                       </div>
                                       <p className="text-white/60 line-clamp-2 mt-0.5">{r.comment}</p>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}
                           </div>
                           <button 
                             onClick={() => { setReviewModalEventId(ev.id); setReviewRating(5); }}
                             className="text-xs text-gh-orange hover:text-white transition-colors flex items-center gap-1"
                           >
                             <MessageSquare className="w-3.5 h-3.5" /> Write Review
                           </button>
                        </div>
                      );
                    })()}

                    <div className="mt-auto flex gap-2 items-center justify-between">
                      <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter flex items-center gap-1">
                        {ev.sourcePlatform === 'YouTube' && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
                        {ev.sourcePlatform}
                      </span>
                      <a 
                        onClick={(e) => e.stopPropagation()}
                        href={ev.sourceLink || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={cn(
                          "px-4 py-2 rounded-lg font-bold text-xs transition-colors text-center inline-flex items-center gap-2",
                          ev.isPromoted ? "bg-gh-gold text-black hover:opacity-90" : "bg-white/10 text-white hover:bg-white/20"
                        )}
                      >
                        {ev.sourcePlatform === 'YouTube' ? 'WATCH PROMO' : ev.isPromoted ? 'GET TICKETS' : 'VIEW DETAILS'}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Floating Action Button (Mobile) */}
      <motion.button 
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsSubmitModalOpen(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-gh-orange rounded-full shadow-lg shadow-gh-orange/20 flex items-center justify-center text-gh-black z-50 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Review Modal */}
      <AnimatePresence>
        {reviewModalEventId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
            onClick={() => setReviewModalEventId(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-gh-black border border-white/10 rounded-2xl p-6 w-full max-w-sm my-8"
            >
              <h2 className="text-xl font-heading font-bold mb-1">Write a Review</h2>
              <p className="text-xs text-gh-muted mb-4">Share your experience about this event.</p>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const newReview: Review = {
                    id: Math.random().toString(36).substr(2, 9),
                    eventId: reviewModalEventId,
                    rating: reviewRating,
                    author: (formData.get('author') as string) || 'Anonymous',
                    comment: formData.get('comment') as string,
                    date: new Date().toISOString().split('T')[0]
                  };
                  setReviews(prev => ({ ...prev, [reviewModalEventId]: [newReview, ...(prev[reviewModalEventId] || [])] }));
                  setReviewModalEventId(null);
                }}
                className="space-y-4"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button type="button" key={star} onClick={() => setReviewRating(star)} className="focus:outline-none hover:scale-110 transition-transform">
                      <Star className={cn("w-8 h-8", star <= reviewRating ? "text-gh-gold fill-gh-gold" : "text-white/20 fill-transparent")} />
                    </button>
                  ))}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 uppercase">Name (Optional)</label>
                  <input name="author" type="text" placeholder="John Doe" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gh-gold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 uppercase">Comments</label>
                  <textarea required name="comment" rows={3} placeholder="Tell us about your experience..." className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gh-gold outline-none resize-none"></textarea>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setReviewModalEventId(null)} className="flex-1 px-4 py-2 rounded-xl font-medium bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 rounded-xl font-medium bg-gh-gold text-black hover:opacity-90 transition-colors flex justify-center items-center gap-2">
                    <Check className="w-4 h-4"/> Post Review
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit Modal */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
            onClick={() => setIsSubmitModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-gh-black border border-white/10 rounded-2xl p-6 w-full max-w-lg my-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-heading font-bold">Promote Your Event</h2>
                  <p className="text-sm text-gh-muted">Getting your vibe on the radar.</p>
                </div>
                <div className="bg-gh-orange/20 text-gh-orange p-3 rounded-full">
                  <Flame className="w-6 h-6" />
                </div>
              </div>

              <form onSubmit={handleCommunitySubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 uppercase">Event Name</label>
                  <input required name="name" type="text" placeholder="Detty Rave 2026..." className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/70 uppercase">Date</label>
                    <input required name="date" type="date" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none pointer-events-[auto] [&::-webkit-calendar-picker-indicator]:invert" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/70 uppercase">Time</label>
                    <input required name="time" type="time" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none [&::-webkit-calendar-picker-indicator]:invert" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/70 uppercase">Venue</label>
                    <input required name="venue" type="text" placeholder="Untamed Empire" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/70 uppercase">City</label>
              <select 
                className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none"
                name="city"
                defaultValue="Greater Accra"
              >
                <option value="Ahafo">Ahafo</option>
                <option value="Ashanti">Ashanti</option>
                <option value="Bono">Bono</option>
                <option value="Bono East">Bono East</option>
                <option value="Central">Central</option>
                <option value="Eastern">Eastern</option>
                <option value="Greater Accra">Greater Accra</option>
                <option value="North East">North East</option>
                <option value="Northern">Northern</option>
                <option value="Oti">Oti</option>
                <option value="Savannah">Savannah</option>
                <option value="Upper East">Upper East</option>
                <option value="Upper West">Upper West</option>
                <option value="Volta">Volta</option>
                <option value="Western">Western</option>
                <option value="Western North">Western North</option>
              </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/70 uppercase">Category</label>
                    <select name="category" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none">
                      <option>Concert</option>
                      <option>Party</option>
                      <option>Campus</option>
                      <option>Comedy</option>
                      <option>Festival</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-white/70 uppercase">Price Range</label>
                    <input required name="price" type="text" placeholder="GHS 100 - 500" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 uppercase">IG / Ticketing Link</label>
                  <input required name="sourceLink" type="url" placeholder="https://instagram.com/..." className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none" />
                </div>

                <div className="space-y-1 mb-2">
                  <label className="text-xs font-semibold text-white/70 uppercase">Cover Image (Optional)</label>
                  <input name="coverImage" type="file" accept="image/*" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20" />
                </div>

                <div className="space-y-1 mb-6">
                  <label className="text-xs font-semibold text-white/70 uppercase">Short Description</label>
                  <textarea required name="description" rows={2} placeholder="Vibes on vibes..." className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none resize-none"></textarea>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsSubmitModalOpen(false)} className="flex-1 px-4 py-3 rounded-xl font-medium bg-white/5 hover:bg-white/10 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" className="flex-1 px-4 py-3 rounded-xl font-medium bg-gradient-to-r from-gh-orange to-red-500 hover:opacity-90 shadow-lg shadow-gh-orange/20 transition-all text-white flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Submit Event
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact Admin Modal */}
      <AnimatePresence>
        {isContactModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsContactModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-gh-black border border-white/10 rounded-2xl p-6 w-full max-w-sm my-8"
            >
              <h2 className="text-xl font-heading font-bold mb-1">Contact Us</h2>
              <p className="text-xs text-gh-muted mb-4">Want us to add your event or need help? Send a message below.</p>

              <div className="mb-4">
                <a 
                  href="https://wa.me/233508069257?text=Hi!%20I%20want%20to%20submit%20an%20event." 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex justify-center items-center gap-2 w-full px-4 py-2 rounded-xl font-medium bg-[#25D366] text-white hover:bg-[#128C7E] transition-colors shadow-lg"
                >
                  <MessageSquare className="w-4 h-4" /> Reach out on WhatsApp
                </a>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <hr className="flex-1 border-white/10" />
                <span className="text-xs text-white/40 uppercase font-semibold">Or email us</span>
                <hr className="flex-1 border-white/10" />
              </div>
              
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  try {
                    await fetch('/api/contact', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: formData.get('name'),
                        email: formData.get('email'),
                        message: formData.get('message')
                      })
                    });
                    setIsContactModalOpen(false);
                    showToast("Message sent successfully!", 'success');
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 uppercase">Name</label>
                  <input required name="name" type="text" placeholder="Your Name" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gh-gold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 uppercase">Email</label>
                  <input required name="email" type="email" placeholder="you@example.com" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gh-gold outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-white/70 uppercase">Message</label>
                  <textarea required name="message" rows={4} placeholder="How can we help?" className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gh-gold outline-none resize-none"></textarea>
                </div>
                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsContactModalOpen(false)} className="flex-1 px-4 py-2 rounded-xl font-medium bg-white/5 hover:bg-white/10 transition-colors">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 rounded-xl font-medium bg-gh-gold text-black hover:opacity-90 transition-colors">
                    Send Message
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              layoutId={selectedEvent.id}
              className="bg-gh-black border border-white/10 rounded-2xl w-full max-w-2xl my-8 overflow-hidden relative shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/90 backdrop-blur-md rounded-full transition-colors z-20"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              <div className="relative w-full h-64 sm:h-80 bg-gradient-to-br from-gh-black-light to-gh-black">
                <EventImage event={selectedEvent} />
                <div className="absolute inset-0 bg-gradient-to-t from-gh-black via-gh-black/40 to-transparent" />
                <div className="absolute bottom-4 left-6 right-6">
                  <div className="flex gap-2 mb-3">
                    <Badge variant="gold">{selectedEvent.category}</Badge>
                    {selectedEvent.isPromoted && <Badge variant="gold">Featured ⭐</Badge>}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-display font-bold leading-tight drop-shadow-lg text-white">
                    {selectedEvent.name}
                  </h2>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row gap-8">
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <Calendar className="w-5 h-5 text-gh-orange mb-2" />
                        <div className="text-xs text-white/50 uppercase font-semibold">Date & Time</div>
                        <div className="font-medium text-sm mt-1">{selectedEvent.date}</div>
                        <div className="text-white/70 text-sm">{selectedEvent.time}</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <MapPin className="w-5 h-5 text-gh-gold mb-2" />
                        <div className="text-xs text-white/50 uppercase font-semibold">Location</div>
                        <div className="font-medium text-sm mt-1">{selectedEvent.venue}</div>
                        <div className="text-white/70 text-sm">{selectedEvent.city}</div>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                        <Ticket className="w-5 h-5 text-afro-neon mb-2" />
                        <div className="text-xs text-white/50 uppercase font-semibold">Price</div>
                        <div className="font-medium text-sm mt-1">{selectedEvent.price}</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold mb-3 border-b border-white/10 pb-2">About Event</h3>
                      <p className="text-white/70 text-sm leading-relaxed whitespace-pre-wrap">
                        {selectedEvent.description || "More details coming soon..."}
                      </p>
                    </div>
                  </div>

                  <div className="w-full sm:w-64 space-y-4 shrink-0">
                    <div className="bg-gh-black-light border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center min-h-[160px]">
                      <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                        <Map className="w-5 h-5 text-gh-muted" />
                      </div>
                      <span className="text-xs text-white/50 text-center px-4">Map placeholder (Integration ready)</span>
                    </div>

                    <a 
                      href={selectedEvent.sourceLink || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-gh-orange to-gh-gold text-black font-bold py-3 px-4 rounded-xl hover:opacity-90 transition-all hover:scale-[1.02]"
                    >
                      {selectedEvent.sourcePlatform === 'YouTube' ? 'WATCH VIDEO' : 'GET TICKETS'}
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating WhatsApp Button */}
      <a
        href="https://wa.me/233508069257?text=Hi!%20I'm%20visiting%20your%20site%20and%20would%20like%20to%20get%20in%20touch."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl transition-transform hover:scale-110 hover:bg-[#128C7E]"
        aria-label="Contact on WhatsApp"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      </a>
    </div>
  );
}
