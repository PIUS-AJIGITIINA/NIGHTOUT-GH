import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  app.get('/api/events', async (req, res) => {
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
                // Try to parse the text. If it contains citations, we strip them.
                // Replace any citation like [1], [2] at the end of properties
                let rawText = response.text.replace(/```json/g, '').replace(/```/g, '');
                rawText = rawText.replace(/\[\d+\]/g, '').trim(); 
                
                const aiEvents = JSON.parse(rawText);
                if (Array.isArray(aiEvents)) {
                    results.push(...aiEvents);
                }
             } catch (parseErr) {
                 console.error("Failed to parse Gemini output:", parseErr);
                 // If parsing fails, fall back gracefully
             }
          }
        }
      } catch (err: any) {
        // Log a more user friendly message for rate limits instead of the giant JSON
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
            console.error('Eventbrite error status:', ebResponse.status);
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
      
      // Fallback if no events found at all
      if (uniqueEvents.length === 0) {
        uniqueEvents.push(
            { id: "fb1", name: "Chale Wote Street Art Festival", date: "2026-08-20", time: "10:00 AM", venue: "James Town", city: "Greater Accra", category: "Festival", price: "Free", description: "The biggest street art festival in West Africa.", sourceLink: "https://chalewote.com", sourcePlatform: "Local Vibes", coverImage: "https://images.unsplash.com/photo-1533174000265-e9b4dfebfacb?auto=format&fit=crop&q=80&w=800" },
            { id: "fb2", name: "Kumasi Carnival", date: "2026-11-05", time: "2:00 PM", venue: "Baba Yara Stadium", city: "Ashanti", category: "Party", price: "GHS 50", description: "Massive carnival shutting down Oseikrom.", sourceLink: "#", sourcePlatform: "Local Vibes", coverImage: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&q=80&w=800" },
            { id: "fb3", name: "Tidal Rave 2026", date: "2026-10-15", time: "12:00 PM", venue: "Kokrobite Beach", city: "Greater Accra", category: "Concert", price: "GHS 150", description: "The ultimate beach experience.", sourceLink: "#", sourcePlatform: "Local Vibes", coverImage: null },
            { id: "fb4", name: "Laugh Out Loud GH", date: "2026-09-10", time: "8:00 PM", venue: "National Theatre", city: "Greater Accra", category: "Comedy", price: "GHS 100", description: "Top comedians from across the continent.", sourceLink: "#", sourcePlatform: "Local Vibes", coverImage: null }
        );
      }

      res.json({ events: uniqueEvents, errors });

    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
