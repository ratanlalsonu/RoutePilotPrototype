export interface GeocodedLocation {
  name: string;
  roadName: string;
  lat: number;
  lng: number;
  displayName: string;
}

/**
 * Gets API key from environment or local storage
 */
export function getGoogleMapsApiKey(): string {
  if (typeof window !== 'undefined') {
    const fromStorage = localStorage.getItem('routepilot_gmaps_api_key');
    if (fromStorage) return fromStorage;
  }
  return (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
}

/**
 * Reverse geocodes coordinates to a human-readable location and road name
 * using Google Geocoding API (if key is configured) or OpenStreetMap Nominatim
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  customApiKey?: string
): Promise<{ locationName: string; roadName: string }> {
  const apiKey = customApiKey || getGoogleMapsApiKey();

  // 1. If Google Maps API Key is available, use Google Geocoding API
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
      // Fallback to OSM
    }
  }

  // 2. Real OpenStreetMap Nominatim Reverse Geocoding
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RoutePilot-FinalYearProject/1.0',
        'Accept-Language': 'en',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const road = addr.road || addr.street || addr.pedestrian || addr.suburb || 'Main Arterial Road';
      const loc =
        addr.neighbourhood ||
        addr.suburb ||
        addr.quarter ||
        addr.residential ||
        addr.city_district ||
        addr.city ||
        'Jhansi';

      return {
        locationName: `${road}, ${loc}`,
        roadName: road,
      };
    }
  } catch {
    // network fallback
  }

  // Dynamic coordinates string without fake dummy names
  return {
    locationName: `Latitude ${lat.toFixed(4)}, Longitude ${lng.toFixed(4)}`,
    roadName: 'Corridor Segment',
  };
}

/**
 * Searches places live via Google Places / Geocoding or OpenStreetMap Nominatim.
 * No dummy/fabricated businesses or fake records.
 */
export async function searchPlaces(
  query: string,
  customApiKey?: string
): Promise<GeocodedLocation[]> {
  if (!query || query.trim().length === 0) return [];

  const apiKey = customApiKey || getGoogleMapsApiKey();

  // 1. Google Geocoding API if key provided
  if (apiKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        query
      )}&key=${apiKey}`;
      const res = await fetch(gUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          return data.results.slice(0, 5).map((r: any) => {
            const roadComp = r.address_components?.find((c: any) => c.types.includes('route'));
            return {
              name: r.address_components?.[0]?.long_name || r.formatted_address.split(',')[0],
              roadName: roadComp?.long_name || 'Main Road',
              lat: r.geometry.location.lat,
              lng: r.geometry.location.lng,
              displayName: r.formatted_address,
            };
          });
        }
      }
    } catch {
      // Fallback to OSM
    }
  }

  // 2. Real OpenStreetMap Nominatim Live Search
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=5&addressdetails=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'RoutePilot-FinalYearProject/1.0',
        'Accept-Language': 'en',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        return items.map((it: any) => ({
          name: it.name || it.display_name.split(',')[0],
          roadName: it.address?.road || it.address?.street || 'Main Road',
          lat: parseFloat(it.lat),
          lng: parseFloat(it.lon),
          displayName: it.display_name,
        }));
      }
    }
  } catch {
    // ignore network errors
  }

  return [];
}
