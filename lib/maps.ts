// Map provider abstraction. Nothing in the app should import Mapbox/Google
// Maps/OSM SDKs directly — everything goes through this interface, so
// swapping MAPS_PROVIDER in .env is a one-file change.

export type LatLng = { lat: number; lng: number };

export interface MapsProvider {
  distanceKm(a: LatLng, b: LatLng): Promise<number>;
  geocode(addressText: string): Promise<LatLng | null>;
}

// Haversine formula — good enough for "approximate distance" sorting/filtering
// without needing any external API key. Real routing distance (Phase 2) can
// replace this once MAPS_PROVIDER is set to "mapbox" | "google" | "osm".
class HaversineProvider implements MapsProvider {
  async distanceKm(a: LatLng, b: LatLng): Promise<number> {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const h =
      Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  async geocode(): Promise<LatLng | null> {
    // No-op without a real provider configured. Phase 2: call
    // Mapbox/Google/OSM geocoding API here based on MAPS_PROVIDER.
    return null;
  }
}

export function getMapsProvider(): MapsProvider {
  // Phase 2: branch on process.env.MAPS_PROVIDER to return a
  // MapboxProvider / GoogleMapsProvider / OsmProvider implementation.
  return new HaversineProvider();
}
