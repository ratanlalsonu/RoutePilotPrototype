import dotenv from 'dotenv';
dotenv.config({ override: true });
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function placesApiProxyPlugin(): Plugin {
  return {
    name: 'places-api-proxy',
    configureServer(server) {
      // 1. Text Search API Proxy
      server.middlewares.use('/api/places/search', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        try {
          const url = new URL(req.url || '', 'http://localhost:3000');
          const query = url.searchParams.get('q') || '';
          let apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
          const paramKey = url.searchParams.get('key');
          if (paramKey && paramKey.startsWith('AIzaSy')) {
            apiKey = paramKey;
          }

          if (!query) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Query parameter q is required' }));
          }

          if (!apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ places: [] }));
          }

          // 1. Call Google Places API (New) Text Search
          const googleRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.shortFormattedAddress',
            },
            body: JSON.stringify({
              textQuery: query,
              maxResultCount: 8,
            }),
          });

          const data = await googleRes.json();
          if (data.places && Array.isArray(data.places) && data.places.length > 0) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(data));
          }

          // 2. Fallback to Autocomplete + Place Details for partial prefixes (e.g. "del", "agr", "kan")
          const autoRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
            },
            body: JSON.stringify({
              input: query,
            }),
          });

          if (autoRes.ok) {
            const autoData = await autoRes.json();
            if (autoData.suggestions && Array.isArray(autoData.suggestions) && autoData.suggestions.length > 0) {
              const predictions = autoData.suggestions.slice(0, 5);
              const resolvedPlaces = await Promise.all(
                predictions.map(async (sug: any) => {
                  const placeId = sug.placePrediction?.placeId;
                  if (!placeId) return null;
                  try {
                    const detailRes = await fetch(
                      `https://places.googleapis.com/v1/places/${placeId}?fields=displayName,formattedAddress,location,shortFormattedAddress`,
                      {
                        headers: {
                          'X-Goog-Api-Key': apiKey,
                        },
                      }
                    );
                    if (detailRes.ok) {
                      return await detailRes.json();
                    }
                  } catch {
                    return null;
                  }
                  return null;
                })
              );

              const validPlaces = resolvedPlaces.filter(Boolean);
              if (validPlaces.length > 0) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ places: validPlaces }));
              }
            }
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ places: [] }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
        }
      });

      // 2. Autocomplete Suggestions API Proxy
      server.middlewares.use('/api/places/autocomplete', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        try {
          const url = new URL(req.url || '', 'http://localhost:3000');
          const input = url.searchParams.get('input') || url.searchParams.get('q') || '';
          let apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
          const paramKey = url.searchParams.get('key');
          if (paramKey && paramKey.startsWith('AIzaSy')) {
            apiKey = paramKey;
          }

          if (!input) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Input parameter is required' }));
          }

          if (!apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ suggestions: [] }));
          }

          const googleRes = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
            },
            body: JSON.stringify({
              input,
            }),
          });

          const data = await googleRes.json();
          res.statusCode = googleRes.status;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
        }
      });

      // 3. High-Speed OSRM Routing Proxy (bypasses browser CORS & adblockers)
      server.middlewares.use('/api/osrm/route', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        try {
          const url = new URL(req.url || '', 'http://localhost:3000');
          const coords = url.searchParams.get('coords') || '';
          const alternatives = url.searchParams.get('alternatives') || '3';
          const steps = url.searchParams.get('steps') || 'true';
          const annotations = url.searchParams.get('annotations') || 'true';
          if (!coords) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'coords parameter required' }));
          }

          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&alternatives=${alternatives}&steps=${steps}&annotations=${annotations}`;
          const osrmRes = await fetch(osrmUrl);
          const data = await osrmRes.json();
          res.statusCode = osrmRes.status;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message || 'Routing proxy error' }));
        }
      });

      // 4. OSRM Nearest Road Snapping Proxy
      server.middlewares.use('/api/osrm/nearest', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        try {
          const url = new URL(req.url || '', 'http://localhost:3000');
          const coords = url.searchParams.get('coords') || '';
          const number = url.searchParams.get('number') || '1';
          if (!coords) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'coords parameter required (lon,lat)' }));
          }

          const osrmUrl = `https://router.project-osrm.org/nearest/v1/driving/${coords}?number=${number}`;
          const osrmRes = await fetch(osrmUrl);
          const data = await osrmRes.json();
          res.statusCode = osrmRes.status;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message || 'Nearest road proxy error' }));
        }
      });

      // 5. Google Directions Proxy (for seamless Google Maps route calculation)
      server.middlewares.use('/api/directions', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        try {
          const url = new URL(req.url || '', 'http://localhost:3000');
          const origin = url.searchParams.get('origin') || '';
          const destination = url.searchParams.get('destination') || '';
          const waypoints = url.searchParams.get('waypoints') || '';
          let apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || '';
          const paramKey = url.searchParams.get('key');
          if (paramKey && paramKey.startsWith('AIzaSy')) {
            apiKey = paramKey;
          }

          if (!origin || !destination || !apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ routes: [] }));
          }

          let gUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&alternatives=true&key=${apiKey}`;
          if (waypoints) {
            gUrl += `&waypoints=${encodeURIComponent(waypoints)}`;
          }

          const gRes = await fetch(gUrl);
          const data = await gRes.json();
          res.statusCode = gRes.status;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message || 'Directions proxy error' }));
        }
      });

      // 6. Google Snap to Roads Proxy
      server.middlewares.use('/api/roads/snap', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        try {
          const url = new URL(req.url || '', 'http://localhost:3000');
          const pathParam = url.searchParams.get('path') || '';
          let apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || '';
          const paramKey = url.searchParams.get('key');
          if (paramKey && paramKey.startsWith('AIzaSy')) {
            apiKey = paramKey;
          }

          if (!pathParam || !apiKey) {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ snappedPoints: [] }));
          }

          const snapUrl = `https://roads.googleapis.com/v1/snapToRoads?path=${encodeURIComponent(pathParam)}&interpolate=true&key=${apiKey}`;
          const gRes = await fetch(snapUrl);
          const data = await gRes.json();
          res.statusCode = gRes.status;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ error: err.message || 'Road snap proxy error' }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), placesApiProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
