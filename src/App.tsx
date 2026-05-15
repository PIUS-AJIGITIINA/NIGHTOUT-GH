import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Calendar, Clock, ExternalLink, Ticket, Filter, Play, Plus, Map, Share2, Youtube, Flame, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EventItem } from './types';

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

function Badge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'gold' | 'outline' }) {
  return (
    <span className={cn(
      "px-2 py-1 text-xs font-semibold rounded-md tracking-wide",
      {
        'bg-gh-black-light text-white border border-white/10': variant === 'default',
        'bg-gradient-to-r from-gh-gold to-yellow-500 text-gh-black': variant === 'gold',
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
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');

  // Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

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
        if (data.errors?.length) {
          setErrorLogs(data.errors);
        }
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
      setErrorLogs(['Network error fetching baseline events']);
    } finally {
      setLoading(false);
    }
  };

  const allEvents = useMemo(() => {
    return [...communityEvents, ...events];
  }, [events, communityEvents]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Free text search
      const matchesSearch = !searchQuery || 
        ev.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        ev.venue.toLowerCase().includes(searchQuery.toLowerCase());
      
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
    });
  }, [allEvents, searchQuery, cityFilter, categoryFilter, dateFilter]);

  const handleCommunitySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
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
      coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&q=80&w=800',
    };
    
    setCommunityEvents([newEvent, ...communityEvents]);
    setIsSubmitModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gh-black text-white selection:bg-gh-orange selection:text-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gh-black/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center sm:h-20 py-4 sm:py-0 gap-4">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setSearchQuery(''); fetchEvents(); }}>
              <div className="w-10 h-10 bg-gh-orange flex items-center justify-center font-bold text-black rounded-sm text-lg">
                🇬🇭
              </div>
              <h1 className="text-3xl font-display tracking-tightest">
                <span className="text-gh-gold">NIGHTOUT</span> GH
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
              <button 
                onClick={() => setIsSubmitModalOpen(true)}
                className="hidden sm:flex items-center gap-2 text-sm font-semibold text-gh-gold border border-gh-gold px-4 py-2 rounded-full featured-badge hover:bg-gh-gold/10 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>PROMOTE YOUR EVENT</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-gh-gold/10 px-4 sm:px-8 py-2 flex flex-col sm:flex-row sm:items-center justify-between border-b border-gh-gold/20 shrink-0 gap-2">
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-gh-gold">Scanning {cityFilter === 'All' ? 'all regions' : cityFilter}... 👀</span>
        </div>
        <div className="flex gap-4 text-[10px] font-mono opacity-60 italic">
          <span className="text-gh-orange">LIVE FEED:</span> {filteredEvents.length} events found
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8 p-4 glass rounded-2xl">
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

          <div className="flex-1"></div>
          
          <button 
            onClick={fetchEvents} 
            disabled={loading}
            className="text-sm text-gh-orange hover:text-white transition-colors underline underline-offset-4 decoration-gh-orange/50"
          >
            Refresh Events
          </button>
        </div>

        {/* Status Indicators */}
        {errorLogs.length > 0 && !loading && (
          <div className="mb-6 p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-xs text-red-200/70 font-mono">
            <p className="font-semibold text-red-400 mb-1">Source warnings:</p>
            <ul className="list-disc pl-4 space-y-1">
              {errorLogs.map((log, i) => <li key={i}>{log}</li>)}
            </ul>
          </div>
        )}

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
            <div className="w-24 h-24 mb-6 rounded-full bg-gh-black-light flex items-center justify-center border border-white/5">
              <Map className="w-10 h-10 text-white/20" />
            </div>
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
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
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
                  }}
                  className={cn(
                    "group flex flex-col glass rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]",
                    ev.isPromoted ? "card-gradient border-gh-gold shadow-2xl z-10" : "hover:bg-white/5"
                  )}
                >
                  {/* Image / Cover */}
                  <div className="relative w-full aspect-[4/3] bg-gradient-to-br from-gh-black-light to-gh-black overflow-hidden">
                    {ev.coverImage ? (
                      <img src={ev.coverImage} alt={ev.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center flex-col justify-center opacity-30">
                        <Flame className="w-16 h-16 mb-2 text-gh-orange/50" />
                      </div>
                    )}
                    {/* Overlays */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 shadow-lg">
                      {ev.isCommunitySubmitted && <Badge variant="gold" className="shadow-black/50 shadow-md">Community Choice ✨</Badge>}
                      {ev.isPromoted && <Badge variant="gold" className="shadow-black/50 shadow-md">Featured ⭐</Badge>}
                    </div>
                    
                    <div className="absolute top-3 right-3 flex gap-1">
                      <div className="bg-black/60 backdrop-blur-md p-1.5 rounded-lg border border-white/10">
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

                    <div className="mt-auto pt-4 flex gap-2 items-center justify-between">
                      <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter flex items-center gap-1">
                        {ev.sourcePlatform === 'YouTube' && <span className="w-2 h-2 rounded-full bg-red-600"></span>}
                        {ev.sourcePlatform}
                      </span>
                      <a 
                        href={ev.sourceLink || '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={cn(
                          "px-4 py-2 rounded-lg font-bold text-xs transition-colors text-center inline-flex items-center gap-2",
                          ev.isPromoted ? "bg-gh-gold text-black hover:bg-yellow-400" : "bg-white/10 text-white hover:bg-white/20"
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
      <button 
        onClick={() => setIsSubmitModalOpen(true)}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 bg-gh-orange rounded-full shadow-lg shadow-gh-orange/20 flex items-center justify-center text-gh-black z-50 hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>

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

                <div className="space-y-1 mb-6">
                  <label className="text-xs font-semibold text-white/70 uppercase">Short Description</label>
                  <textarea name="description" rows={2} placeholder="Vibes on vibes..." className="w-full bg-gh-black-light border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gh-orange outline-none resize-none"></textarea>
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
    </div>
  );
}
