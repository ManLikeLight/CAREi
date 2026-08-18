/**
 * Electronic Visit Verification (EVV) — core types and utilities
 *
 * Verification methods (in priority order):
 *  1. Geolocation — navigator.geolocation, checked against a 100 m geofence
 *  2. NFC — Web NFC API (NDEFReader), Android Chrome only
 *  3. Offline capture — timestamp + available evidence, flagged for review
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type EVVMethod   = "geo" | "nfc" | "offline";
export type EVVStatus   = "verified" | "outside-range" | "nfc-verified" | "nfc-mismatch" | "unverified";

export interface EVVRecord {
  method:          EVVMethod;
  status:          EVVStatus;
  timestamp:       string;   // ISO 8601
  /** Captured coordinates (present when geolocation succeeded) */
  coords?: {
    lat:      number;
    lng:      number;
    accuracy: number;  // metres
  };
  /** Distance from client address in metres (present when geolocation succeeded) */
  distanceMetres?: number;
  /** NFC tag UID that was scanned (present on NFC attempts) */
  nfcUid?: string;
  /** Whether this record is flagged for supervisor review */
  flagged:    boolean;
  flagReason?: string;
}

// ── Client coordinates for geofence checks ───────────────────────────────────

export interface ClientCoords {
  lat:            number;
  lng:            number;
  geofenceMetres: number;
}

/** Approximate coordinates for demo clients (Reading, UK) */
export const CLIENT_COORDS: Record<string, ClientCoords> = {
  mary:  { lat: 51.4320, lng: -0.9895, geofenceMetres: 100 },
  tom:   { lat: 51.4540, lng: -0.9710, geofenceMetres: 100 },
  aisha: { lat: 51.4648, lng: -1.0012, geofenceMetres: 100 },
};

// ── Haversine distance ────────────────────────────────────────────────────────

/**
 * Returns the great-circle distance between two WGS-84 points in metres.
 * Accurate to within ~0.3 % for distances up to a few kilometres.
 */
export function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R  = 6_371_000; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Capability detection ──────────────────────────────────────────────────────

/** True when Web NFC is available (Android Chrome ≥ 89 only) */
export function isNFCSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

/** True when the Geolocation API is available */
export function isGeolocationSupported(): boolean {
  return typeof window !== "undefined" && "geolocation" in navigator;
}

// ── Geolocation helper ────────────────────────────────────────────────────────

export interface GeoResult {
  ok:       boolean;
  coords?:  { lat: number; lng: number; accuracy: number };
  denied?:  boolean;
  error?:   string;
}

/** Wraps getCurrentPosition in a Promise with a 15-second timeout */
export function getCurrentPosition(): Promise<GeoResult> {
  return new Promise((resolve) => {
    if (!isGeolocationSupported()) {
      resolve({ ok: false, error: "Geolocation not supported on this device." });
      return;
    }
    const timer = setTimeout(
      () => resolve({ ok: false, error: "Location request timed out." }),
      15_000,
    );
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve({
          ok: true,
          coords: {
            lat:      pos.coords.latitude,
            lng:      pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          },
        });
      },
      (err) => {
        clearTimeout(timer);
        resolve({
          ok:      false,
          denied:  err.code === err.PERMISSION_DENIED,
          error:   err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enable location for this site in your browser settings."
            : "Could not determine your location.",
        });
      },
      { enableHighAccuracy: true, timeout: 14_000, maximumAge: 0 },
    );
  });
}

// ── EVV record builders ───────────────────────────────────────────────────────

export function buildGeoEVV(
  coords: { lat: number; lng: number; accuracy: number },
  distanceMetres: number,
  geofenceMetres: number,
): EVVRecord {
  const withinRange = distanceMetres <= geofenceMetres;
  return {
    method:         "geo",
    status:         withinRange ? "verified" : "outside-range",
    timestamp:      new Date().toISOString(),
    coords,
    distanceMetres,
    flagged:        !withinRange,
    flagReason:     withinRange ? undefined
      : `Carer was ${Math.round(distanceMetres)} m from client address (geofence: ${geofenceMetres} m).`,
  };
}

export function buildNFCEVV(uid: string, expectedUid?: string): EVVRecord {
  const match = expectedUid
    ? uid.toLowerCase() === expectedUid.toLowerCase()
    : false; // no registered tag → flag
  return {
    method:    "nfc",
    status:    match ? "nfc-verified" : "nfc-mismatch",
    timestamp: new Date().toISOString(),
    nfcUid:    uid,
    flagged:   !match,
    flagReason: match ? undefined
      : expectedUid
        ? `Scanned tag UID (${uid}) does not match the registered tag for this client.`
        : "No NFC tag is registered for this client — tag UID recorded for review.",
  };
}

export function buildOfflineEVV(): EVVRecord {
  return {
    method:    "offline",
    status:    "unverified",
    timestamp: new Date().toISOString(),
    flagged:   true,
    flagReason: "Presence could not be verified electronically — manual review required.",
  };
}
