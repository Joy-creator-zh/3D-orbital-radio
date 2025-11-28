import { Station } from '../types';
import * as THREE from 'three';

const API_BASE = 'https://de1.api.radio-browser.info/json/stations/search';

// Helper to handle individual fetch requests
const fetchSubset = async (params: URLSearchParams): Promise<Station[]> => {
  try {
    const response = await fetch(`${API_BASE}?${params.toString()}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("API subset fetch failed", e);
    return [];
  }
}

export const fetchStations = async (): Promise<Station[]> => {
  // 1. Global Top Stations
  const globalParams = new URLSearchParams({
    limit: '4000',
    hidebroken: 'true',
    order: 'clickcount',
    reverse: 'true',
    is_https: 'true',
    has_geo_info: 'true'
  });

  // 2. East/SE Asia Regional Boost
  // Centered roughly on the East China Sea to cover China, Japan, Korea, Taiwan, and SE Asia
  const asiaParams = new URLSearchParams({
    limit: '2500', 
    hidebroken: 'true',
    order: 'clickcount',
    reverse: 'true',
    is_https: 'true',
    has_geo_info: 'true',
    lat: '30',    // Latitude roughly between Japan and SE Asia
    long: '120',  // Longitude covering the vertical slice of East Asia
    radius: '3500' // 3500km radius covers JP, KR, CN, TW, PH, VN, TH, ID, etc.
  });

  try {
    const [globalData, asiaData] = await Promise.all([
      fetchSubset(globalParams),
      fetchSubset(asiaParams)
    ]);

    // Combine and Deduplicate
    const allStations = [...globalData, ...asiaData];
    const seen = new Set();
    const uniqueStations: Station[] = [];

    for (const s of allStations) {
      if (seen.has(s.stationuuid)) continue;
      
      const codec = s.codec.toLowerCase();
      const url = (s.url_resolved || s.url).toLowerCase();
      
      // Strict codec check: Browsers reliably play MP3 and AAC
      const isSupportedCodec = codec === 'mp3' || codec.includes('aac') || codec === 'audio/mpeg';
      
      // Filter out legacy playlist files (.m3u, .pls) but ALLOW .m3u8 (HLS) which we now support
      const isLegacyPlaylist = (url.endsWith('.m3u') || url.endsWith('.pls')) && !url.includes('m3u8');

      if (isSupportedCodec && 
          !isLegacyPlaylist && 
          s.geo_lat !== null && 
          s.geo_long !== null) {
          
          seen.add(s.stationuuid);
          uniqueStations.push(s);
      }
    }
    
    return uniqueStations;
  } catch (error) {
    console.error('Failed to fetch stations:', error);
    return [];
  }
};

// Convert Lat/Lon to 3D Vector Position on a Sphere
export const latLongToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return new THREE.Vector3(x, y, z);
};

// Haversine formula to find distance between two lat/lon points in km
export const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};