import express from 'express';
import path from 'path';
import cors from 'cors';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// For Vercel, we must write to /tmp as the rest of the filesystem is read-only
const isVercel = process.env.VERCEL === '1';
const dataPath = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');

if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}
const eventsFilePath = path.join(dataPath, 'customEvents.json');
const contactFilePath = path.join(dataPath, 'contactMessages.json');
const hiddenFilePath = path.join(dataPath, 'hiddenEvents.json');

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
let cachedErrors: string[] = [];
let isScanning = false;

async function scanEvents() {
  if (isScanning) return;
  isScanning = true;
  console.log("Scanning for new events...");
  try {
    const results: any[] = [];
    const errors: string[] = [];

    // 1. Fetch from Gemini with Search Grounding
    try {
      if (process.env.GEMINI_API_KEY) {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: "Find the best upcoming events, concerts, campus parties, and comedy shows in Accra, Kumasi, and other major cities in Ghana for 2026. Give me exactly 12 events. Return the data ONLY as RAW JSON with no markdown block ticks. It must be an array of objects. Keys: id (string), name (string), date (YYYY-MM-DD), time (HH:MM AM/PM), venue, city, category (Concert, Party, Campus, Comedy, Festival, or Other), price, description, sourceLink, sourcePlatform (Gemini Search), coverImage (can be empty string).",
          config: {
            tools: [{ googleSearch: {} }] // Using Search Grounding
          }
        });

        if (response.text) {
           try {
              let rawText = response.text.replace(/```json/g, '').replace(/```/g, '');
              rawText = rawText.replace(/\[\d+\]/g, '').trim(); 
              
              const aiEvents = JSON.parse(rawText);
              if (Array.isArray(aiEvents)) {
                  results.push(...aiEvents);
              }
           } catch (parseErr) {
               console.error("Failed to parse Gemini output:", parseErr);
           }
        }
      }
    } catch (err: any) {
      if (err.message && err.message.includes('429')) {
           console.error('Gemini Rate Limit Exceeded - serving fallback data.');
      } else {
           console.error('Gemini error:', err.message);
      }
    }

    // 2. Fetch from Eventbrite
    try {
      if (process.env.EVENTBRITE_API_KEY) {
        const ebResponse = await fetch(
          'https://www.eventbriteapi.com/v3/events/search/?location.address=Ghana&expand=venue',
          { headers: { Authorization: `Bearer ${process.env.EVENTBRITE_API_KEY}` } }
        );
        if (ebResponse.ok) {
          const ebData = await ebResponse.json();
          const ebEvents = (ebData.events || []).map((ev: any) => ({
            id: ev.id,
            name: ev.name?.text,
            date: ev.start?.local?.split('T')[0] || '',
            time: ev.start?.local?.split('T')[1]?.substring(0, 5) || '',
            venue: ev.venue?.name || 'Various',
            city: ev.venue?.address?.city || 'Accra',
            category: 'Other',
            price: ev.is_free ? 'Free' : 'Paid',
            description: ev.description?.text?.substring(0, 100) || '',
            sourceLink: ev.url,
            sourcePlatform: 'Eventbrite',
            coverImage: ev.logo?.url || ''
          }));
          results.push(...ebEvents);
        } else {
          if (ebResponse.status !== 404 && ebResponse.status !== 403) {
            console.error('Eventbrite error status:', ebResponse.status);
          }
        }
      }
    } catch (err: any) {
      console.error('Eventbrite error:', err.message);
    }

    // 3. Fetch from YouTube
    try {
      if (process.env.YOUTUBE_API_KEY) {
         const ytResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=Ghana+upcoming+events+2026&type=video&key=${process.env.YOUTUBE_API_KEY}`
        );
        if (ytResponse.ok) {
          const ytData = await ytResponse.json();
          const ytEvents = (ytData.items || []).map((item: any) => ({
            id: item.id?.videoId,
            name: item.snippet?.title,
            date: new Date().toISOString().split('T')[0], // Approximation for video updates
            time: 'TBA',
            venue: 'Various',
            city: (item.snippet?.title || '').toLowerCase().includes('kumasi') ? 'Kumasi' : 'Greater Accra',
            category: 'Concert',
            price: 'Varies',
            description: item.snippet?.description?.substring(0, 100),
            sourceLink: `https://youtube.com/watch?v=${item.id?.videoId}`,
            sourcePlatform: 'YouTube',
            coverImage: item.snippet?.thumbnails?.high?.url || ''
          }));
          results.push(...ytEvents);
        } else {
           console.error('YouTube error status:', ytResponse.status);
        }
      }
    } catch (err: any) {
       console.error('YouTube error:', err.message);
    }

    // Deduplicate by name and date to avoid strict ID collisions across different sources
    const uniqueEvents = [];
    const seen = new Set();
    for (const ev of results) {
       const key = `${ev.name}-${ev.date}`.toLowerCase();
       if (!seen.has(key)) {
          uniqueEvents.push(ev);
          seen.add(key);
       }
    }
    
    cachedScannedEvents = uniqueEvents;
    cachedErrors = errors;
    console.log(`Scan complete. Found ${cachedScannedEvents.length} events.`);

  } catch (err: any) {
    console.error("General error in scanEvents:", err.message);
  } finally {
    isScanning = false;
  }
}

// Initial scan
scanEvents();
setInterval(scanEvents, 2 * 60 * 1000);

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
    // If not scanned yet, trigger now
    if (cachedScannedEvents.length === 0 && !isScanning) {
       scanEvents();
    }
    
    const uniqueEvents = [...cachedScannedEvents];
    uniqueEvents.push(...customEvents);

    uniqueEvents.push(
        { id: "fb1", name: "Chale Wote Street Art Festival", date: "2026-08-20", time: "10:00 AM", venue: "James Town", city: "Greater Accra", category: "Festival", price: "Free", description: "The biggest street art festival in West Africa.", sourceLink: "https://chalewote.com", sourcePlatform: "Local Vibes", coverImage: "https://upload.wikimedia.org/wikipedia/commons/f/f4/Chale_Wote_Street_Art_Festival_5.jpg" },
        { id: "fb2", name: "Homowo Festival", date: "2026-08-15", time: "All Day", venue: "Ga Mashie", city: "Greater Accra", category: "Festival", price: "Free", description: "The annual festival to hoot at hunger.", sourceLink: "#", sourcePlatform: "Local Vibes", coverImage: "https://upload.wikimedia.org/wikipedia/commons/f/fb/Image_from_Homowo_Festival_in_Ghana.jpg" },
        { id: "fb3", name: "Tidal Rave 2026", date: "2026-10-15", time: "12:00 PM", venue: "Kokrobite Beach", city: "Greater Accra", category: "Concert", price: "GHS 150", description: "The ultimate beach experience.", sourceLink: "#", sourcePlatform: "Local Vibes", coverImage: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&q=80&w=800" },
        { id: "fb4", name: "Aboakyir Festival", date: "2026-05-02", time: "8:00 AM", venue: "Winneba", city: "Central Region", category: "Festival", price: "Free", description: "Deer hunting festival of the Effutu people.", sourceLink: "#", sourcePlatform: "Local Vibes", coverImage: "https://media.gettyimages.com/id/679632904/photo/aboakyir-festival.jpg" },
        { id: "fb5", name: "Laugh Out Loud GH", date: "2026-09-10", time: "8:00 PM", venue: "National Theatre", city: "Greater Accra", category: "Comedy", price: "GHS 100", description: "Top comedians from across the continent.", sourceLink: "#", sourcePlatform: "Local Vibes", coverImage: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&q=80&w=800" }
    );

    const finalEvents = uniqueEvents.filter(e => !hiddenEvents.includes(e.id));

    res.json({ events: finalEvents, errors: cachedErrors });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Setup function for standalone server mode
export async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production' && !isVercel) {
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
