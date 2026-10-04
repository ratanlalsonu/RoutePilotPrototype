export interface GeocodedLocation {
  name: string;
  roadName: string;
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Gets API key from environment or local storage (optional)
 */
export function getGoogleMapsApiKey(): string {
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('routepilot_gmaps_api_key');
    if (fromStorage && fromStorage.trim().length > 0) return fromStorage.trim();
  }
  return ((import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '').trim();
}

/**
 * Gets Places API key from environment or local storage (optional)
 */
export function getGooglePlacesApiKey(): string {
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('routepilot_places_api_key');
    if (fromStorage && fromStorage.trim().length > 0) {
      return fromStorage.trim();
    }
  }
  const placesEnv = ((import.meta as any).env?.VITE_GOOGLE_PLACES_API_KEY || '').trim();
  if (placesEnv) return placesEnv;
  return getGoogleMapsApiKey();
}

/**
 * Verified Real Places Database (Jhansi, Bundelkhand, UP, MP & Major Indian Corridors)
 * Provides instant 0ms autocomplete matching as user types, backed by real GPS coordinates.
 */
const REAL_KNOWN_PLACES: GeocodedLocation[] = [
  // Jhansi City & Surroundings
  {
    name: 'Maharani Laxmi Bai Medical College',
    roadName: 'Kanpur-Gwalior Bypass Road',
    lat: 25.4678,
    lng: 78.5835,
    displayName: 'MLB Medical College, Kanpur Road, Jhansi, Uttar Pradesh 284128',
  },
  {
    name: 'Jhansi Fort (Rani Laxmi Bai Fort)',
    roadName: 'Fort Road / Rani Mahal Marg',
    lat: 25.4578,
    lng: 78.5782,
    displayName: 'Jhansi Fort, Gwalior Road, Jhansi, Uttar Pradesh 284001',
  },
  {
    name: 'Jhansi Junction Railway Station (VGLB)',
    roadName: 'Station Road / Civil Lines',
    lat: 25.4520,
    lng: 78.5580,
    displayName: 'Veerangana Lakshmibai Jhansi Railway Station, Jhansi, UP 284003',
  },
  {
    name: 'Elite Chauraha (Elite Crossing)',
    roadName: 'Civil Lines Road / Kanpur Rd',
    lat: 25.4470,
    lng: 78.5720,
    displayName: 'Elite Crossing, Civil Lines, Jhansi, Uttar Pradesh 284001',
  },
  {
    name: 'Sipri Bazar',
    roadName: 'Sipri Main Road',
    lat: 25.4580,
    lng: 78.5450,
    displayName: 'Sipri Bazar Commercial Hub, Jhansi, Uttar Pradesh 284003',
  },
  {
    name: 'Sadar Bazar',
    roadName: 'Sadar Main Arterial',
    lat: 25.4430,
    lng: 78.5750,
    displayName: 'Sadar Bazar Cantonment Area, Jhansi, Uttar Pradesh 284001',
  },
  {
    name: 'Bundelkhand University',
    roadName: 'Kanpur Road Highway',
    lat: 25.4445,
    lng: 78.6015,
    displayName: 'Bundelkhand University Campus, Kanpur Road, Jhansi, UP 284128',
  },
  {
    name: 'Bipin Bihari College (BBC)',
    roadName: 'Civil Lines Arterial',
    lat: 25.4540,
    lng: 78.5710,
    displayName: 'Bipin Bihari Degree College, Civil Lines, Jhansi, Uttar Pradesh',
  },
  {
    name: 'Rani Mahal',
    roadName: 'Rani Mahal Marg',
    lat: 25.4505,
    lng: 78.5810,
    displayName: 'Rani Mahal Heritage Site, Jhansi, Uttar Pradesh 284002',
  },
  {
    name: 'Pahuj River Bridge / Embankment',
    roadName: 'Pahuj Dam Road',
    lat: 25.4710,
    lng: 78.5520,
    displayName: 'Pahuj River Bridge & Reservoir, Jhansi, Uttar Pradesh',
  },
  {
    name: 'Civil Lines Bridge',
    roadName: 'Civil Lines Main Road',
    lat: 25.4585,
    lng: 78.5765,
    displayName: 'Civil Lines Flyover Bridge, Jhansi, Uttar Pradesh 284001',
  },
  {
    name: 'Hansari',
    roadName: 'Gwalior Highway Link',
    lat: 25.4310,
    lng: 78.5420,
    displayName: 'Hansari Industrial Corridor, Jhansi, Uttar Pradesh',
  },
  {
    name: 'Babina Cantonment',
    roadName: 'NH-44 Highway',
    lat: 25.2450,
    lng: 78.4720,
    displayName: 'Babina Military Cantonment, Jhansi District, UP 284401',
  },
  {
    name: 'Orchha Fort & Ram Raja Temple',
    roadName: 'Orchha Bypass Road',
    lat: 25.3515,
    lng: 78.6420,
    displayName: 'Ram Raja Temple & Fort Complex, Orchha, Niwari District, MP',
  },
  {
    name: 'Datia Pitambara Peeth',
    roadName: 'Gwalior-Jhansi Highway NH-44',
    lat: 25.6690,
    lng: 78.4610,
    displayName: 'Shri Pitambara Peeth, Datia, Madhya Pradesh 475661',
  },
  {
    name: 'Gwalior Fort',
    roadName: 'Fort Road / Gwalior Bypass',
    lat: 26.2300,
    lng: 78.1690,
    displayName: 'Gwalior Fort Heritage Zone, Gwalior, Madhya Pradesh 474008',
  },
  {
    name: 'Gwalior Railway Station',
    roadName: 'Station Road, Gwalior',
    lat: 26.2160,
    lng: 78.1880,
    displayName: 'Gwalior Junction Railway Station, Gwalior, Madhya Pradesh',
  },
  {
    name: 'Kanpur Central Railway Station',
    roadName: 'GT Road / Station Rd',
    lat: 26.4540,
    lng: 80.3510,
    displayName: 'Kanpur Central Railway Station, Kanpur, Uttar Pradesh 208004',
  },
  {
    name: 'Agra Cantt Railway Station',
    roadName: 'Mall Road, Agra Cantt',
    lat: 27.1580,
    lng: 77.9940,
    displayName: 'Agra Cantonment Railway Station, Agra, Uttar Pradesh 282001',
  },
  {
    name: 'Taj Mahal, Agra',
    roadName: 'Taj East Gate Road',
    lat: 27.1751,
    lng: 78.0421,
    displayName: 'Taj Mahal Monument, Dharmapuri, Forest Colony, Agra, UP 282001',
  },
  {
    name: 'Lucknow Charbagh Railway Station',
    roadName: 'Kanpur - Lucknow Road',
    lat: 26.8320,
    lng: 80.9180,
    displayName: 'Lucknow Charbagh NR Railway Station, Lucknow, Uttar Pradesh',
  },
  {
    name: 'New Delhi Railway Station (NDLS)',
    roadName: 'Bhavbhuti Marg, Connaught Place',
    lat: 28.6430,
    lng: 77.2195,
    displayName: 'New Delhi Railway Station, Paharganj, New Delhi 110002',
  },
  {
    name: 'India Gate, New Delhi',
    roadName: 'Kartavya Path',
    lat: 28.6129,
    lng: 77.2295,
    displayName: 'India Gate War Memorial, Rajpath, New Delhi 110001',
  },
  {
    name: 'Bhopal Junction Railway Station',
    roadName: 'Hamidia Road, Bhopal',
    lat: 23.2680,
    lng: 77.4140,
    displayName: 'Bhopal Junction, Railway Colony, Bhopal, Madhya Pradesh 462001',
  },
  {
    name: 'Indore Junction Railway Station',
    roadName: 'Chhoti Gwaltoli, Indore',
    lat: 22.7170,
    lng: 75.8680,
    displayName: 'Indore Junction, Siyaganj, Indore, Madhya Pradesh 452001',
  },
  {
    name: 'Varanasi Junction (Cantt)',
    roadName: 'Varanasi Cantt Station Rd',
    lat: 25.3280,
    lng: 82.9730,
    displayName: 'Varanasi Junction Railway Station, Varanasi, Uttar Pradesh 221002',
  },
  {
    name: 'Prayagraj Junction (Allahabad)',
    roadName: 'Civil Lines, Prayagraj',
    lat: 25.4480,
    lng: 81.8340,
    displayName: 'Prayagraj Junction Railway Station, Prayagraj, Uttar Pradesh 211001',
  },
  {
    name: 'Jaipur Railway Station',
    roadName: 'Station Road, Gopalbari',
    lat: 26.9200,
    lng: 75.7870,
    displayName: 'Jaipur Junction Railway Station, Jaipur, Rajasthan 302006',
  },
];

/**
 * Searches places with instant local filtering + multi-engine live geocoding
 * 1. Immediate local matching for 0ms autocomplete response
 * 2. Photon Komoot OSM API (high-speed free autocomplete with full CORS)
 * 3. OpenStreetMap Nominatim API fallback
 * 4. Google Geocoding API if key configured
 */
export async function searchPlaces(
  query: string,
  customApiKey?: string
): Promise<GeocodedLocation[]> {
  const q = query?.trim().toLowerCase();
  if (!q || q.length === 0) return [];

  const resultsMap = new Map<string, GeocodedLocation>();

  // 1. Instant Match from Verified Real Database (0ms latency!)
  const localMatches = REAL_KNOWN_PLACES.filter((p) => {
    return (
      p.name.toLowerCase().includes(q) ||
      p.displayName.toLowerCase().includes(q) ||
      p.roadName.toLowerCase().includes(q)
    );
  });

  localMatches.forEach((item) => {
    const key = `${item.name}-${item.lat.toFixed(3)}`;
    resultsMap.set(key, item);
  });

  const placesKey = customApiKey || getGooglePlacesApiKey();

  // 2. Google Places API (New) via Proxy Server
  if (placesKey) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(query)}&key=${encodeURIComponent(placesKey)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (data.places && Array.isArray(data.places)) {
          data.places.forEach((p: any) => {
            const name = p.displayName?.text || p.shortFormattedAddress || query;
            const lat = p.location?.latitude;
            const lng = p.location?.longitude;
            if (lat != null && lng != null) {
              const displayName = p.formattedAddress || name;
              const roadName = p.shortFormattedAddress?.split(',')?.[0] || 'Main Corridor';
              const key = `${name}-${lat.toFixed(3)}`;
              resultsMap.set(key, {
                name,
                roadName,
                lat,
                lng,
                displayName,
              });
            }
          });
        }
      }
    } catch {
      // Fallback to JS SDK / Geocoding
    }
  }

  // 3. Browser Google Maps JS SDK Places API (New) if initialized in client
  if (typeof window !== 'undefined' && (window as any).google?.maps?.places?.Place?.searchByText) {
    try {
      const { places } = await (window as any).google.maps.places.Place.searchByText({
        textQuery: query,
        fields: ['displayName', 'formattedAddress', 'location', 'shortFormattedAddress'],
        maxResultCount: 8,
      });
      if (places && Array.isArray(places)) {
        places.forEach((p: any) => {
          const name = p.displayName || query;
          const lat = typeof p.location?.lat === 'function' ? p.location.lat() : p.location?.lat;
          const lng = typeof p.location?.lng === 'function' ? p.location.lng() : p.location?.lng;
          if (lat != null && lng != null) {
            const displayName = p.formattedAddress || name;
            const roadName = p.shortFormattedAddress || 'Main Corridor';
            const key = `${name}-${lat.toFixed(3)}`;
            resultsMap.set(key, {
              name,
              roadName,
              lat,
              lng,
              displayName,
            });
          }
        });
      }
    } catch {
      // Continue
    }
  }

  // 4. Photon Komoot API — High Speed OpenStreetMap Autocomplete with CORS
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2800);

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=7`;
    const res = await fetch(photonUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.features && Array.isArray(data.features)) {
        data.features.forEach((f: any) => {
          const props = f.properties || {};
          const coords = f.geometry?.coordinates; // [lng, lat]
          if (coords && coords.length >= 2) {
            const lng = coords[0];
            const lat = coords[1];
            const name = props.name || props.street || props.city || query;
            const roadName = props.street || props.district || props.city || 'Connecting Road';
            const displayParts = [
              props.name,
              props.street,
              props.city || props.town || props.village,
              props.state,
              props.country,
            ].filter(Boolean);

            const displayName = displayParts.join(', ') || name;
            const key = `${name}-${lat.toFixed(3)}`;
            if (!resultsMap.has(key)) {
              resultsMap.set(key, {
                name,
                roadName,
                lat,
                lng,
                displayName,
              });
            }
          }
        });
      }
    }
  } catch {
    // Continue to Nominatim
  }

  // 4. OpenStreetMap Nominatim Live Search Fallback
  if (resultsMap.size < 4) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&limit=5&addressdetails=1`;

      const res = await fetch(nomUrl, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          items.forEach((it: any) => {
            const name = it.name || it.display_name.split(',')[0];
            const roadName = it.address?.road || it.address?.street || 'Main Road';
            const lat = parseFloat(it.lat);
            const lng = parseFloat(it.lon);
            const key = `${name}-${lat.toFixed(3)}`;
            if (!resultsMap.has(key)) {
              resultsMap.set(key, {
                name,
                roadName,
                lat,
                lng,
                displayName: it.display_name,
              });
            }
          });
        }
      }
    } catch {
      // ignore
    }
  }

  return Array.from(resultsMap.values()).slice(0, 8);
}

/**
 * Reverse geocodes coordinates to a human-readable location and road name
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  customApiKey?: string
): Promise<{ locationName: string; roadName: string }> {
  // Check known places proximity first (< 300m)
  for (const p of REAL_KNOWN_PLACES) {
    const dLat = Math.abs(p.lat - lat);
    const dLng = Math.abs(p.lng - lng);
    if (dLat < 0.003 && dLng < 0.003) {
      return { locationName: p.name, roadName: p.roadName };
    }
  }

  const apiKey = customApiKey || getGoogleMapsApiKey();

  // 1. Google Geocoding API if key available
  if (apiKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const res = await fetch(gUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const first = data.results[0];
          const routeComp = first.address_components?.find((c: any) => c.types.includes('route'));
          const sublocalityComp = first.address_components?.find(
            (c: any) => c.types.includes('sublocality') || c.types.includes('neighborhood')
          );
          const roadName = routeComp?.long_name || 'Main Road';
          const locationName = sublocalityComp
            ? `${roadName}, ${sublocalityComp.long_name}`
            : first.formatted_address.split(',')[0];
          return { locationName, roadName };
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. Photon Reverse Geocoding
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const pUrl = `https://photon.komoot.io/reverse?lon=${lng}&lat=${lat}`;
    const res = await fetch(pUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.features && data.features.length > 0) {
        const props = data.features[0].properties || {};
        const road = props.street || props.name || 'Main Arterial';
        const loc = props.city || props.town || props.district || 'Corridor';
        return {
          locationName: `${road}, ${loc}`,
          roadName: road,
        };
      }
    }
  } catch {
    // fallback
  }

  // 3. Nominatim Reverse Geocoding
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.street || addr.pedestrian || addr.suburb || 'Main Arterial Road';
      const loc = addr.neighbourhood || addr.suburb || addr.city || 'Corridor';
      return {
        locationName: `${road}, ${loc}`,
        roadName: road,
      };
    }
  } catch {
    // fallback
  }

  return {
    locationName: `Latitude ${lat.toFixed(4)}, Longitude ${lng.toFixed(4)}`,
    roadName: 'Active Road Corridor',
  };
}
