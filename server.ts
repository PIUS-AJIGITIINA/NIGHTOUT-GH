import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { XMLParser } from 'fast-xml-parser';

// For Vercel, we must write to /tmp as the rest of the filesystem is read-only
const isVercel = !!process.env.VERCEL;
let dataPath = path.join(process.cwd(), 'data');
try {
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
} catch(e) {
  dataPath = '/tmp/data';
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
}
const eventsFilePath = path.join(dataPath, 'customEvents.json');
const contactFilePath = path.join(dataPath, 'contactMessages.json');
const hiddenFilePath = path.join(dataPath, 'hiddenEvents.json');
const scannedFilePath = path.join(dataPath, 'scannedEvents.json');

let customEvents: any[] = [];
if (fs.existsSync(eventsFilePath)) {
  try {
    customEvents = JSON.parse(fs.readFileSync(eventsFilePath, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse custom events:', e);
  }
}

let contactMessages: any[] = [];
if (fs.existsSync(contactFilePath)) {
  try {
    contactMessages = JSON.parse(fs.readFileSync(contactFilePath, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse contact messages:', e);
  }
}

let hiddenEvents: string[] = [];
if (fs.existsSync(hiddenFilePath)) {
  try {
    hiddenEvents = JSON.parse(fs.readFileSync(hiddenFilePath, 'utf-8'));
  } catch (e) {
    console.error('Failed to parse hidden events:', e);
  }
}

let cachedScannedEvents: any[] = [];
let cachedErrors: any = {};
let cacheMetadata: any = { lastScanned: "", sources: {} as Record<string, number>, errors: {} as Record<string, string> };
let lastScanTime = 0;

if (fs.existsSync(scannedFilePath)) {
  try {
    const data = JSON.parse(fs.readFileSync(scannedFilePath, 'utf-8'));
    cachedScannedEvents = data.events || [];
    cacheMetadata = data.metadata || { lastScanned: "", sources: {}, errors: {} };
    cachedErrors = cacheMetadata.errors || {};
    lastScanTime = data.lastScanTime || 0;
  } catch (e) {
    console.error('Failed to parse cached scanned events:', e);
  }
} else {
  cacheMetadata = { lastScanned: "", sources: {} as Record<string, number>, errors: {} as Record<string, string> };
}

let isScanning = false;

async function retryGeminiCall(fn: () => Promise<any>, maxRetries = 4) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (err?.message?.includes('429') || err?.message?.includes('EXHAUSTED') || err?.message?.includes('quota')) {
        if (attempt >= maxRetries) return { text: "" };
        await new Promise(r => setTimeout(r, 10000 * attempt)); // wait 10s, 20s, 30s
      } else {
        if (attempt >= maxRetries) return { text: "" };
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }
  return { text: "" };
}

async function fetchUnsplashImage(query: string) {
  if (!process.env.UNSPLASH_ACCESS_KEY) return "";
  try {
    const res = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
    if (res.ok) {
      const data = await res.json();
      return data.urls?.regular || "";
    } else {
      // Fallback to search if random fails
      const searchRes = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}&per_page=10`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          const randomIdx = Math.floor(Math.random() * searchData.results.length);
          return searchData.results[randomIdx].urls?.regular || "";
        }
      }
    }
  } catch (e) {}
  return "";
}

async function fetchGeminiEvents(): Promise<any[]> {
  if (!process.env.GEMINI_API_KEY) return [];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const queries = [
    "Upcoming events concerts festivals parties in Ghana 2026",
    "Comedy shows university events nightlife Accra 2026"
  ];
  
  const allEvents: any[] = [];
  await Promise.all(queries.map(async (q) => {
    try {
      const response = await retryGeminiCall(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Find 10 best upcoming events for query: "${q}". Return ONLY RAW JSON array of objects. Keys: name, date(YYYY-MM-DD), time, venue, city, category(Concert|Party|Campus|Comedy|Festival|Other), price, description, sourceLink, sourcePlatform("Gemini Search"), coverImage("").`,
        config: { tools: [{ googleSearch: {} }] }
      }));
      let text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
      text = text?.replace(/\[\d+\]/g, ''); 
      if (text) {
         const parsed = JSON.parse(text);
         if (Array.isArray(parsed)) allEvents.push(...parsed);
      }
    } catch(e) {}
  }));
  return allEvents;
}

async function fetchScrapedEvents(): Promise<any[]> {
  if (!process.env.GEMINI_API_KEY) return [];
  const urls = ["https://ghanamusic.com/events", "https://ticketplus.com.gh"];
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const allEvents: any[] = [];
  await Promise.all(urls.map(async (url) => {
    try {
      const response = await retryGeminiCall(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Extract upcoming events from this URL mapping: ${url}. Return JSON array keys: name, date(YYYY-MM-DD), time, venue, city, category(Concert|Party|Campus|Comedy|Festival|Other), price, description, sourceLink, sourcePlatform("Web Scraped"), coverImage(""). Raw JSON only.`,
        config: { tools: [{ googleSearch: {} }] }
      }));
      let text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
      if (text) {
         const parsed = JSON.parse(text);
         if (Array.isArray(parsed)) allEvents.push(...parsed);
      }
    } catch(e) {}
  }));
  return allEvents;
}

async function fetchEventbriteEvents(): Promise<any[]> {
  const fbQuery = async () => {
    if (!process.env.GEMINI_API_KEY) return [];
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await retryGeminiCall(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Find 10 upcoming events from Eventbrite in Ghana (Accra, Kumasi, etc.). Return ONLY RAW JSON array of objects. Keys: name, date(YYYY-MM-DD), time, venue, city, category(Other), price, description, sourceLink, sourcePlatform("Eventbrite (Search)"), coverImage("").`,
      config: { tools: [{ googleSearch: {} }] }
    }));
    let text = response.text?.replace(/```json/g, '').replace(/```/g, '').trim();
    text = text?.replace(/\[\d+\]/g, ''); 
    if (text) {
       const parsed = JSON.parse(text);
       return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  };

  if (!process.env.EVENTBRITE_API_KEY) return await fbQuery();
  try {
    const res = await fetch('https://www.eventbriteapi.com/v3/events/search/?location.address=Ghana&expand=venue', {
      headers: { Authorization: `Bearer ${process.env.EVENTBRITE_API_KEY}` }
    });
    if (!res.ok) {
      if (res.status === 401 || res.status === 403 || res.status === 404) {
        return await fbQuery();
      }
      const errorText = await res.text();
      throw new Error(`Eventbrite API failed: ${res.status} ${res.statusText} ${errorText}`);
    }
    const data = await res.json();
    return (data.events || []).map((ev: any) => ({
      name: ev.name?.text, date: ev.start?.local?.split('T')[0], time: ev.start?.local?.split('T')[1]?.substring(0, 5),
      venue: ev.venue?.name, city: ev.venue?.address?.city, category: 'Other', price: ev.is_free ? 'Free' : 'Paid',
      description: ev.description?.text?.substring(0, 100), sourceLink: ev.url, sourcePlatform: 'Eventbrite', coverImage: ev.logo?.url || ''
    }));
  } catch(e) { 
    return await fbQuery();
  }
}

async function fetchYouTubeEvents(): Promise<any[]> {
  if (!process.env.YOUTUBE_API_KEY) return [];
  const queries = ["Ghana upcoming events 2026", "Ghana concert festival 2026"];
  const allEvents: any[] = [];
  await Promise.all(queries.map(async (q) => {
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&maxResults=10&type=video&key=${process.env.YOUTUBE_API_KEY}`);
      if (!res.ok) return;
      const data = await res.json();
      allEvents.push(...(data.items || []).map((item: any) => ({
         name: item.snippet?.title, date: new Date().toISOString().split('T')[0], time: 'TBA', venue: 'Various',
         city: (item.snippet?.title || '').toLowerCase().includes('kumasi') ? 'Kumasi' : 'Greater Accra',
         category: 'Concert', price: 'Varies', description: item.snippet?.description,
         sourceLink: `https://youtube.com/watch?v=${item.id?.videoId}`, sourcePlatform: 'YouTube', coverImage: item.snippet?.thumbnails?.high?.url || ''
      })));
    } catch(e) {}
  }));
  return allEvents;
}

async function fetchTicketmasterEvents(): Promise<any[]> {
  if (!process.env.TICKETMASTER_API_KEY) return [];
  try {
    const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?countryCode=GH&apikey=${process.env.TICKETMASTER_API_KEY}`);
    if (!res.ok) throw new Error("TM fetch failed");
    const data = await res.json();
    return (data._embedded?.events || []).map((ev: any) => ({
       name: ev.name, date: ev.dates?.start?.localDate, time: ev.dates?.start?.localTime,
       venue: ev._embedded?.venues?.[0]?.name, city: ev._embedded?.venues?.[0]?.city?.name,
       category: ev.classifications?.[0]?.segment?.name || 'Other',
       price: ev.priceRanges?.[0] ? `${ev.priceRanges[0].currency} ${ev.priceRanges[0].min}` : 'TBD',
       description: ev.info || '', sourceLink: ev.url, sourcePlatform: 'Ticketmaster', coverImage: ev.images?.[0]?.url || ''
    }));
  } catch(e) { throw e; }
}

async function fetchPredictHQEvents(): Promise<any[]> {
  if (!process.env.PREDICTHQ_API_KEY) return [];
  try {
    const res = await fetch(`https://api.predicthq.com/v1/events/?country=GH&limit=50`, {
      headers: { Authorization: `Bearer ${process.env.PREDICTHQ_API_KEY}` }
    });
    if (!res.ok) throw new Error("PredictHQ fetch failed");
    const data = await res.json();
    return (data.results || []).map((ev: any) => ({
       name: ev.title, date: ev.start?.split('T')[0], time: ev.start?.split('T')[1]?.substring(0,5),
       venue: ev.location?.[0]?.toString(), city: 'Ghana', category: ev.category || 'Other',
       price: 'TBD', description: ev.description, sourceLink: '', sourcePlatform: 'PredictHQ', coverImage: ''
    }));
  } catch (e) { throw e; }
}


async function fetchRSSEvents(): Promise<any[]> {
  if (!process.env.GEMINI_API_KEY) return [];
  const urls = ["https://www.myjoyonline.com/entertainment/feed/", "https://www.pulse.com.gh/entertainment/feed", "https://ghanaiantimes.com.gh/feed/"];
  const allEvents: any[] = [];
  const parser = new XMLParser();
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  await Promise.all(urls.map(async (url) => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const obj = parser.parse(text);
      const items = obj?.rss?.channel?.item || obj?.feed?.entry || [];
      const limited = Array.isArray(items) ? items.slice(0, 5) : [items];
      const payload = limited.map((i: any) => `Title: ${i.title}\nDesc: ${i.description || i.summary}`).join('\n\n');
      if (!payload) return;
      
      const response = await retryGeminiCall(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Extract any upcoming events from this text. Return JSON array: [{name, date(YYYY-MM-DD), time, venue, city, category, price, description, sourceLink, sourcePlatform: "RSS Feed", coverImage: ""}]. Text:\n${payload}`
      }));
      let out = response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "";
      if (out) {
         const parsed = JSON.parse(out);
         if (Array.isArray(parsed)) allEvents.push(...parsed);
      }
    } catch(e) {}
  }));
  return allEvents;
}

async function scanEvents() {
  if (isScanning) return;
  const now = Date.now();
  if (now - lastScanTime < 30 * 60 * 1000 && cachedScannedEvents.length > 0) return;
  
  isScanning = true;
  console.log("Scanning for new events across all sources...");
  try {
    const results = await Promise.allSettled([
      fetchGeminiEvents(), fetchEventbriteEvents(), fetchYouTubeEvents(),
      fetchTicketmasterEvents(), fetchPredictHQEvents(), fetchRSSEvents(),
      fetchScrapedEvents()
    ]);
    
    let allRawEvents: any[] = [];
    const localSources: Record<string, number> = {};
    const localErrors: Record<string, string> = {};
    const sourceNames = ["Gemini", "Eventbrite", "YouTube", "Ticketmaster", "PredictHQ", "RSS", "Scraped"];
    
    results.forEach((r, idx) => {
       const srcName = sourceNames[idx];
       if (r.status === 'fulfilled') {
          const evts = r.value || [];
          allRawEvents.push(...evts);
          localSources[srcName] = evts.length;
       } else {
          localErrors[srcName] = (r.reason as Error).message || "Unknown error";
          localSources[srcName] = 0;
       }
    });

    const uniqueMap = new Map();
    for (const ev of allRawEvents) {
       if (!ev.name || !ev.date) continue;
       const key = `${ev.name.toLowerCase().trim()}-${ev.date}`;
       if (!uniqueMap.has(key)) {
          ev.sources = [ev.sourcePlatform];
          ev.id = `evt_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
          uniqueMap.set(key, ev);
       } else {
          const existing = uniqueMap.get(key);
          if (!existing.sources.includes(ev.sourcePlatform)) {
             existing.sources.push(ev.sourcePlatform);
          }
          if (Object.keys(ev).length > Object.keys(existing).length && ev.coverImage) {
             ev.sources = existing.sources;
             ev.id = existing.id;
             uniqueMap.set(key, ev);
          }
       }
    }
    
    let deduplicated = Array.from(uniqueMap.values());
    if (process.env.UNSPLASH_ACCESS_KEY) {
      deduplicated = await Promise.all(deduplicated.map(async (ev) => {
         if (!ev.coverImage) {
            ev.coverImage = await fetchUnsplashImage(`${ev.name} ${ev.city}`);
         }
         return ev;
      }));
    }
    
    cachedScannedEvents = deduplicated;
    cachedErrors = localErrors;
    cacheMetadata = { lastScanned: new Date().toISOString(), sources: localSources, errors: localErrors };
    lastScanTime = now;
    
    try {
      fs.writeFileSync(scannedFilePath, JSON.stringify({
         events: cachedScannedEvents,
         metadata: cacheMetadata,
         lastScanTime: lastScanTime
      }));
    } catch(err) {
      console.error('Error saving scanned events (handled for Vercel)', err);
    }
    
    console.log(`Scan complete. Found ${cachedScannedEvents.length} distinct events.`);
  } catch (err: any) {
    console.error("General error in scanEvents:", err.message);
  } finally {
    isScanning = false;
  }
}

// Initial scan
if (!isVercel) {
  scanEvents();
  setInterval(scanEvents, 30 * 60 * 1000);
}

export const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.post('/api/contact', (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const newContact = { id: Date.now().toString(), name, email, message, date: new Date().toISOString() };
    contactMessages.push(newContact);
    
    try {
       fs.writeFileSync(contactFilePath, JSON.stringify(contactMessages, null, 2));
    } catch (fsError) {
       console.error('Error saving to filesystem, handled for Vercel', fsError);
    }
    
    res.status(201).json(newContact);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/events', (req, res) => {
  try {
    const newEvent = { ...req.body, id: `custom_${Date.now()}` };
    customEvents.unshift(newEvent); // Add to beginning
    
    try {
      fs.writeFileSync(eventsFilePath, JSON.stringify(customEvents, null, 2));
    } catch (fsError) {
       console.error('Error saving to filesystem, handled for Vercel', fsError);
    }
    
    res.status(201).json(newEvent);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/events/google', async (req, res) => {
  try {
    const { query } = req.body;
    
    // Choose an autonomous query if none was provided
    let searchQuery = query;
    if (!searchQuery) {
        const categories = ["tech events", "concerts", "comedy shows", "festivals", "business conferences", "art exhibitions"];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        searchQuery = `best upcoming ${randomCategory} in Accra or major cities in Ghana for 2026`;
    }

    let extractedDetails = {
      title: "Unnamed Event",
      venue: "TBD",
      date: "2026-06-01",
      time: "TBD",
      price: "TBD",
      description: searchQuery,
      sourceLink: "Google Search"
    };

    if (process.env.GEMINI_API_KEY) {
        const { GoogleGenAI } = require('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const analysis = await ai.models.generateContent({
           model: 'gemini-2.5-flash',
           contents: `Act as an event extractor. Find the best upcoming event matching this query: "${searchQuery}". Return the details as JSON ONLY. Keys: title, venue, date (YYYY-MM-DD), time, price, description, sourceLink. Do not use markdown backticks. Return exactly ONE event.`,
           config: {
             tools: [{ googleSearch: {} }] // Using Search Grounding
           }
        });
        
        let jsonStr = analysis.text?.replace(/```json/g, '').replace(/```/g, '').trim() || "{}";
        try {
            const parsed = JSON.parse(jsonStr);
            Object.assign(extractedDetails, parsed);
        } catch(e) {
            console.error("AI parsing failed:", e);
        }
    }

    const newEvent = {
       id: `google_${Date.now()}`,
       name: extractedDetails.title || "Google Extracted Event",
       date: extractedDetails.date || "TBD",
       time: extractedDetails.time || "TBD",
       venue: extractedDetails.venue || "TBD",
       city: extractedDetails.venue && extractedDetails.venue !== 'TBD' ? "Extracted Location" : "Unknown",
       category: "Other", // Default
       price: extractedDetails.price || "TBD",
       description: extractedDetails.description || searchQuery,
       sourceLink: extractedDetails.sourceLink || "Google Search",
       sourcePlatform: "Google Search",
       coverImage: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop",
       organizerUsername: "auto_discovery",
       importedAt: new Date().toISOString()
    };

    customEvents.unshift(newEvent);
    
    try {
      const fs = require('fs');
      fs.writeFileSync(eventsFilePath, JSON.stringify(customEvents, null, 2));
    } catch (fsError) {
      console.error('Error saving to filesystem:', fsError);
    }
    
    res.status(201).json(newEvent);

  } catch (e: any) {
    console.error("Google Import Error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/events/:id', (req, res) => {
  try {
    const idToRemove = req.params.id;
    
    const originalLength = customEvents.length;
    customEvents = customEvents.filter(e => e.id !== idToRemove);
    if (customEvents.length !== originalLength) {
      try {
         fs.writeFileSync(eventsFilePath, JSON.stringify(customEvents, null, 2));
      } catch (fsError) {
         console.error('Error saving to filesystem', fsError);
      }
    }

    if (!hiddenEvents.includes(idToRemove)) {
      hiddenEvents.push(idToRemove);
      try {
         fs.writeFileSync(hiddenFilePath, JSON.stringify(hiddenEvents, null, 2));
      } catch (fsError) {
         console.error('Error saving to filesystem', fsError);
      }
    }

    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/scan', async (req, res) => {
  try {
    if (!isScanning) {
      // Must await for serverless environments (like Vercel) because background tasks are killed
      await scanEvents();
      res.json({ message: 'Scan complete', count: cachedScannedEvents.length });
    } else {
      res.status(429).json({ message: 'Scan already in progress' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete scan' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    if (cachedScannedEvents.length === 0 && !isScanning) {
      if (isVercel) {
         await scanEvents();
      } else {
         scanEvents();
      }
    }
    
    const uniqueEvents = [...cachedScannedEvents];
    uniqueEvents.push(...customEvents);

    const finalEvents = uniqueEvents.filter(e => !hiddenEvents.includes(e.id));

    res.json({ 
       events: finalEvents, 
       errors: cachedErrors,
       sources: cacheMetadata.sources,
       lastScanned: cacheMetadata.lastScanned
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    eventCount: cachedScannedEvents.length,
    lastScanned: cacheMetadata.lastScanned,
    sources: cacheMetadata.sources,
    errors: cacheMetadata.errors
  });
});

// Setup function for standalone server mode
export async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production' && !isVercel) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!isVercel) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0' as any, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Automatically start if not running in Vercel environment
if (!isVercel) {
  startServer();
}
