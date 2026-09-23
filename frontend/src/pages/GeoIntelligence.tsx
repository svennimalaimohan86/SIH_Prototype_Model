import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Clock,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Building2,
  Calendar,
  Layers,
  ChevronRight,
  Search,
  Copy,
  Check,
  Crosshair,
  Navigation,
  Eye,
  Radio,
  BellRing,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  Maximize,
  Minimize,
  Locate,
  Compass,
  Route,
  Car,
  Siren,
  ShieldCheck,
  Users,
  PhoneCall,
  X as CloseIcon,
} from 'lucide-react';
import { api } from '../services/api';
import { ATMLocation, CashoutPrediction, AccountRiskScore, WithdrawalIntel } from '../types';
import { RiskBadge } from '../components/RiskBadge';
import { WithdrawalIntelModal } from '../components/WithdrawalIntelModal';

// Fix for default Leaflet icon assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored HTML circle markers for high/medium/low risk and selected states
const createMarkerIcon = (
  riskLevel: string,
  isPredicted: boolean,
  isSelected: boolean,
  confidence?: number
) => {
  let color = '#3B82F6';
  let pulseHtml = '';

  if (isPredicted) {
    color = '#EF4444';
    pulseHtml = `<div class="absolute -inset-2.5 rounded-full bg-rose-500/35 animate-ping"></div>`;
  } else if (riskLevel === 'HIGH') {
    color = '#EF4444';
  } else if (riskLevel === 'MEDIUM') {
    color = '#F59E0B';
  } else {
    color = '#10B981';
  }

  const ringStyle = isSelected
    ? 'ring-4 ring-brand-500 ring-offset-2 scale-125'
    : 'shadow-lg';

  const iconHtml = `
    <div class="relative flex items-center justify-center transition-transform ${ringStyle}">
      ${isPredicted ? pulseHtml : ''}
      <div style="background-color: ${color}; width: ${isPredicted ? '26px' : '18px'}; height: ${isPredicted ? '26px' : '18px'}; border: 2.5px solid #FFFFFF; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.35);" class="flex items-center justify-center text-white font-black text-[10px]">
        ${isPredicted ? '★' : ''}
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-leaflet-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// "My Location" custom animated blue radar marker
const createMyLocationIcon = () => {
  const iconHtml = `
    <div class="relative flex items-center justify-center">
      <div class="absolute -inset-3 rounded-full bg-blue-500/35 animate-ping"></div>
      <div class="relative w-7 h-7 rounded-full bg-blue-600 border-2.5 border-white shadow-xl flex items-center justify-center text-white">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3" fill="currentColor" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2v3m0 14v3M2 12h3m14 0h3" />
        </svg>
      </div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-my-location-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

// Component to smoothly fly/recenter map when selected ATM changes
const MapFlyTo: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
};

// Component to automatically fit bounds to the full direction route
const MapFitBounds: React.FC<{ bounds: [[number, number], [number, number]] | null }> = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [70, 70], animate: true });
    }
  }, [bounds, map]);
  return null;
};

// Component to trigger Leaflet invalidateSize when toggling fullscreen
const MapResizeHandler: React.FC<{ isFullscreen: boolean }> = ({ isFullscreen }) => {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);
  return null;
};

// Haversine distance calculator between coordinates in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Patrol Unit Model with multi-state jurisdiction and AI recommendation metadata
export interface PatrolUnit {
  id: string;
  unitCode: string;
  name: string;
  callsign: string;
  vehicleType: string;
  officers: string[];
  lat: number;
  lng: number;
  speedKmH: number;
  status: 'PATROLLING' | 'DISPATCHED' | 'STANDBY';
  radioChannel: string;
  state: string;
  city: string;
  tacticalClass: 'QRT' | 'INTERCEPTOR' | 'HIGHWAY' | 'PATROL';
  distanceKm?: number;
  etaMinutes?: number;
  aiScore?: number;
  isRecommended?: boolean;
  recommendationReason?: string;
  bearingDeg?: number;
  compassDirection?: string;
}

// Calculate compass bearing in degrees from point 1 to point 2
export function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const y = Math.sin(dLon) * Math.cos(lat2 * (Math.PI / 180));
  const x =
    Math.cos(lat1 * (Math.PI / 180)) * Math.sin(lat2 * (Math.PI / 180)) -
    Math.sin(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.cos(dLon);
  let brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

export function getCompassDirection(bearingDeg: number): string {
  const directions = ['North (N)', 'North-East (NE)', 'East (E)', 'South-East (SE)', 'South (S)', 'South-West (SW)', 'West (W)', 'North-West (NW)'];
  const index = Math.round(bearingDeg / 45) % 8;
  return directions[index];
}

// Custom Leaflet marker for Police Patrol vehicles with high-definition SVG car and animated dual siren strobes
const createPatrolMarkerIcon = (
  unit: PatrolUnit,
  isRecommended: boolean,
  isDispatched: boolean
) => {
  let pulseHtml = '';
  let badgeBg = 'bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950';
  let ringClass = 'border-slate-300 shadow-lg';
  let starBadge = '';
  let statusBadge = '';

  if (isDispatched) {
    pulseHtml = `
      <div class="absolute -inset-3 rounded-full bg-rose-500/40 animate-ping"></div>
      <div class="absolute -inset-1.5 rounded-full bg-rose-600/30 animate-pulse"></div>
    `;
    badgeBg = 'bg-gradient-to-b from-rose-900 via-red-950 to-slate-950';
    ringClass = 'border-rose-400 ring-4 ring-rose-500/40 shadow-rose-500/40 shadow-xl';
    statusBadge = `
      <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-rose-600 text-white font-black text-[8px] px-2 py-0.5 rounded-full shadow-lg border border-white whitespace-nowrap tracking-wider animate-pulse flex items-center gap-1 select-none">
        <span class="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
        <span>${unit.unitCode} • EN ROUTE</span>
      </div>
    `;
  } else if (isRecommended) {
    pulseHtml = `
      <div class="absolute -inset-2.5 rounded-full bg-amber-400/35 animate-pulse"></div>
    `;
    badgeBg = 'bg-gradient-to-b from-slate-950 via-slate-900 to-amber-950';
    ringClass = 'border-amber-300 ring-3 ring-amber-400/50 shadow-amber-500/25 shadow-xl';
    starBadge = `
      <div class="absolute -top-2 -right-2 bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 rounded-full w-5 h-5 flex items-center justify-center font-black text-[10px] shadow-md border-2 border-white ring-1 ring-amber-500/50 select-none">
        ★
      </div>
    `;
    statusBadge = `
      <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-[8px] px-2 py-0.5 rounded-full shadow-lg border border-white whitespace-nowrap tracking-wider flex items-center gap-1 select-none">
        <span>★ ${unit.unitCode} • ~${unit.etaMinutes || 3}m</span>
      </div>
    `;
  } else {
    statusBadge = `
      <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 text-slate-200 font-extrabold text-[9px] px-1.5 py-0.2 rounded-md shadow-md border border-slate-700 whitespace-nowrap select-none">
        ${unit.unitCode}
      </div>
    `;
  }

  // Bespoke Vector Police Interceptor Car with animated dual-strobe roof lightbar
  const policeCarSvg = `
    <svg class="w-8 h-8 drop-shadow-md transform transition-transform hover:scale-110" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Ground Shadow -->
      <ellipse cx="22" cy="38" rx="15" ry="3" fill="#000000" fill-opacity="0.4" />

      <!-- Rear Body / Trunk -->
      <path d="M12 28C12 26 13 25 15 25H29C31 25 32 26 32 28V33C32 34 31 35 30 35H14C13 35 12 34 12 33V28Z" fill="#0F172A" />

      <!-- White Police Cruiser Cabin Roof -->
      <path d="M14 17C14 15 16 14 18 14H26C28 14 30 15 30 17L31 25H13L14 17Z" fill="#F8FAFC" />

      <!-- Front Hood & Body -->
      <path d="M10 26C10 24 12 23 14 23H30C32 23 34 24 34 26L35 32C35 34 33 35 31 35H13C11 35 9 34 9 32L10 26Z" fill="#0F172A" />

      <!-- Front Tinted Windshield -->
      <path d="M15 18H29L30.5 24H13.5L15 18Z" fill="#0284C7" fill-opacity="0.85" />
      <path d="M16 19L23 19L22 23L15 23L16 19Z" fill="#E0F2FE" fill-opacity="0.4" />

      <!-- White Police Doors with Tactical Stripe -->
      <rect x="11" y="25" width="22" height="6.5" rx="1.5" fill="#F8FAFC" />
      <path d="M12 28.5H32" stroke="#2563EB" stroke-width="1.2" stroke-linecap="round" />
      <text x="22" y="29.7" text-anchor="middle" font-size="4" font-weight="900" fill="#1E3A8A" font-family="system-ui, sans-serif" letter-spacing="0.5">POLICE</text>

      <!-- Front Bull-Bar / Push Bumper -->
      <rect x="12" y="34.8" width="20" height="2" rx="0.8" fill="#334155" />
      <rect x="15" y="33.8" width="2" height="3" fill="#64748B" />
      <rect x="27" y="33.8" width="2" height="3" fill="#64748B" />

      <!-- Xenon Headlights -->
      <ellipse cx="12.5" cy="33.5" rx="2" ry="1.2" fill="#FEF08A" />
      <ellipse cx="31.5" cy="33.5" rx="2" ry="1.2" fill="#FEF08A" />
      <ellipse cx="12.5" cy="33.5" rx="1" ry="0.6" fill="#FFFFFF" />
      <ellipse cx="31.5" cy="33.5" rx="1" ry="0.6" fill="#FFFFFF" />

      <!-- Roof Mounted Emergency Lightbar with Animated Dual Strobes -->
      <rect x="16" y="11.8" width="12" height="2.6" rx="1" fill="#0F172A" stroke="#475569" stroke-width="0.5" />
      <!-- Red Strobe (Left) -->
      <rect x="16.8" y="12" width="4.2" height="2.2" rx="0.7" fill="#EF4444" class="police-strobe-red" />
      <!-- White Speaker Center -->
      <rect x="21.5" y="12" width="1" height="2.2" fill="#E2E8F0" />
      <!-- Blue Strobe (Right) -->
      <rect x="23" y="12" width="4.2" height="2.2" rx="0.7" fill="#3B82F6" class="police-strobe-blue" />
    </svg>
  `;

  const iconHtml = `
    <div class="relative flex items-center justify-center cursor-pointer transition-transform hover:scale-125 select-none">
      ${pulseHtml}
      <div class="w-11 h-11 rounded-2xl ${badgeBg} border-2 ${ringClass} flex items-center justify-center shadow-2xl relative overflow-visible">
        ${policeCarSvg}
      </div>
      ${starBadge}
      ${statusBadge}
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: 'custom-patrol-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Reusable High-Definition Vector Police Patrol Car Badge Component
const PoliceCarBadge: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className = '',
}) => {
  const dims = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  return (
    <div className={`inline-flex items-center justify-center relative shrink-0 ${className}`}>
      <svg className={`${dims} drop-shadow-xs`} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="22" cy="38" rx="14" ry="2.5" fill="#000000" fillOpacity="0.35" />
        <path d="M12 28C12 26 13 25 15 25H29C31 25 32 26 32 28V33C32 34 31 35 30 35H14C13 35 12 34 12 33V28Z" fill="#0F172A" />
        <path d="M14 17C14 15 16 14 18 14H26C28 14 30 15 30 17L31 25H13L14 17Z" fill="#F8FAFC" />
        <path d="M10 26C10 24 12 23 14 23H30C32 23 34 24 34 26L35 32C35 34 33 35 31 35H13C11 35 9 34 9 32L10 26Z" fill="#0F172A" />
        <path d="M15 18H29L30.5 24H13.5L15 18Z" fill="#0284C7" fillOpacity="0.85" />
        <rect x="11" y="25" width="22" height="6.5" rx="1.5" fill="#F8FAFC" />
        <path d="M12 28.5H32" stroke="#2563EB" strokeWidth="1.2" strokeLinecap="round" />
        <text x="22" y="29.7" textAnchor="middle" fontSize="4" fontWeight="900" fill="#1E3A8A" fontFamily="sans-serif">POLICE</text>
        <rect x="12" y="34.8" width="20" height="2" rx="0.8" fill="#334155" />
        <ellipse cx="12.5" cy="33.5" rx="2" ry="1.2" fill="#FEF08A" />
        <ellipse cx="31.5" cy="33.5" rx="2" ry="1.2" fill="#FEF08A" />
        <rect x="16" y="11.8" width="12" height="2.6" rx="1" fill="#0F172A" />
        <rect x="16.8" y="12" width="4.2" height="2.2" rx="0.7" fill="#EF4444" className="police-strobe-red" />
        <rect x="23" y="12" width="4.2" height="2.2" rx="0.7" fill="#3B82F6" className="police-strobe-blue" />
      </svg>
    </div>
  );
};

// Web Audio API Synthesized Police Siren tone (no external mp3 files required)
const playPoliceSirenTone = () => {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const audioCtx = new AudioCtxClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    gain.gain.setValueAtTime(0.09, audioCtx.currentTime);

    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(960, now);
    osc.frequency.setValueAtTime(770, now + 0.25);
    osc.frequency.setValueAtTime(960, now + 0.5);
    osc.frequency.setValueAtTime(770, now + 0.75);
    osc.frequency.setValueAtTime(960, now + 1.0);
    osc.frequency.setValueAtTime(770, now + 1.25);

    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
    osc.start(now);
    osc.stop(now + 1.6);
  } catch (e) {
    console.warn('Web Audio synthesis not allowed or blocked:', e);
  }
};

interface RoadRoute {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  isRealRoad: boolean;
}

export type MapLayerType = 'google-streets' | 'google-hybrid' | 'google-satellite' | 'google-terrain' | 'osm';

export const MAP_LAYERS: Record<
  MapLayerType,
  { name: string; label: string; url: string; subdomains?: string[]; maxZoom?: number; attribution: string }
> = {
  'google-streets': {
    name: 'Google Streets',
    label: 'Google Map',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    maxZoom: 21,
  },
  'google-hybrid': {
    name: 'Google Hybrid',
    label: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite & Road Labels',
    maxZoom: 21,
  },
  'google-satellite': {
    name: 'Google Satellite',
    label: 'Pure Sat',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Satellite',
    maxZoom: 21,
  },
  'google-terrain': {
    name: 'Google Terrain',
    label: 'Terrain',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Terrain',
    maxZoom: 20,
  },
  'osm': {
    name: 'OpenStreetMap',
    label: 'OSM',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
};

// State-Specific & Pan-City Police Patrol Fleets across India
export const STATE_PATROL_FLEETS: Record<string, PatrolUnit[]> = {
  'Tiruchengode': [
    {
      id: 'tn-tc-04',
      unitCode: 'PCR-04',
      name: 'Eagle-1 Mobile Patrol',
      callsign: 'EAGLE-1',
      vehicleType: 'Mahindra Scorpio-N 4x4',
      officers: ['SI K. Arumugam', 'Constable M. Selvan'],
      lat: 11.3620,
      lng: 77.8810,
      speedKmH: 45,
      status: 'PATROLLING',
      radioChannel: 'VHF-158.45 MHz (Zone 4)',
      state: 'Tamil Nadu',
      city: 'Tiruchengode',
      tacticalClass: 'PATROL',
    },
    {
      id: 'tn-tc-11',
      unitCode: 'PCR-11',
      name: 'Cheetah-2 Highway Interceptor',
      callsign: 'CHEETAH-2',
      vehicleType: 'Toyota Innova Crysta Interceptor',
      officers: ['Inspector P. Vetrivel', 'Constable S. Dinesh'],
      lat: 11.3910,
      lng: 77.9040,
      speedKmH: 55,
      status: 'PATROLLING',
      radioChannel: 'VHF-158.60 MHz (Highway)',
      state: 'Tamil Nadu',
      city: 'Tiruchengode',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'tn-tc-07',
      unitCode: 'PCR-07',
      name: 'Hawk-3 City Surveillance',
      callsign: 'HAWK-3',
      vehicleType: 'Tata Safari Stealth',
      officers: ['SI R. Balaji', 'Constable T. Murugan'],
      lat: 11.3480,
      lng: 77.8650,
      speedKmH: 40,
      status: 'PATROLLING',
      radioChannel: 'VHF-158.10 MHz (City Core)',
      state: 'Tamil Nadu',
      city: 'Tiruchengode',
      tacticalClass: 'PATROL',
    },
    {
      id: 'tn-tc-19',
      unitCode: 'PCR-19',
      name: 'Falcon-4 Tactical QRT',
      callsign: 'FALCON-4',
      vehicleType: 'Mahindra Bolero Neo QRT Striker',
      officers: ['Inspector A. Muthuraj', 'QRT Commando V. Rajesh'],
      lat: 11.4050,
      lng: 77.8720,
      speedKmH: 50,
      status: 'PATROLLING',
      radioChannel: 'VHF-159.20 MHz (QRT)',
      state: 'Tamil Nadu',
      city: 'Tiruchengode',
      tacticalClass: 'QRT',
    },
    {
      id: 'tn-tc-23',
      unitCode: 'PCR-23',
      name: 'Tiger-5 Outpost Patrol',
      callsign: 'TIGER-5',
      vehicleType: 'Force Gurkha 4x4',
      officers: ['SI N. Saravanan', 'Constable G. Kannan'],
      lat: 11.3320,
      lng: 77.9250,
      speedKmH: 42,
      status: 'PATROLLING',
      radioChannel: 'VHF-158.85 MHz (Outpost)',
      state: 'Tamil Nadu',
      city: 'Tiruchengode',
      tacticalClass: 'PATROL',
    },
  ],
  'Erode': [
    {
      id: 'tn-er-01',
      unitCode: 'ER-01',
      name: 'Perundurai Fast Interceptor',
      callsign: 'PERUNDURAI-1',
      vehicleType: 'Toyota Innova Crysta Interceptor',
      officers: ['Inspector M. Thangavel', 'Constable P. Mani'],
      lat: 11.3390,
      lng: 77.7180,
      speedKmH: 52,
      status: 'PATROLLING',
      radioChannel: 'VHF-157.80 MHz (Erode North)',
      state: 'Tamil Nadu',
      city: 'Erode',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'tn-er-03',
      unitCode: 'ER-03',
      name: 'Brough Road QRT Patrol',
      callsign: 'BROUGH-3',
      vehicleType: 'Mahindra Scorpio-N QRT',
      officers: ['SI S. Radhakrishnan', 'Constable K. Senthil'],
      lat: 11.3410,
      lng: 77.7260,
      speedKmH: 44,
      status: 'PATROLLING',
      radioChannel: 'VHF-157.95 MHz (Commercial)',
      state: 'Tamil Nadu',
      city: 'Erode',
      tacticalClass: 'QRT',
    },
    {
      id: 'tn-er-08',
      unitCode: 'ER-08',
      name: 'Erode Junction Flying Squad',
      callsign: 'JUNCTION-8',
      vehicleType: 'Tata Safari Stealth',
      officers: ['SI V. Prabhakaran', 'Constable D. Naveen'],
      lat: 11.3260,
      lng: 77.7310,
      speedKmH: 42,
      status: 'PATROLLING',
      radioChannel: 'VHF-158.05 MHz (Railway Div)',
      state: 'Tamil Nadu',
      city: 'Erode',
      tacticalClass: 'PATROL',
    },
    {
      id: 'tn-er-12',
      unitCode: 'ER-12',
      name: 'Bhavani Highway Strike Unit',
      callsign: 'BHAVANI-12',
      vehicleType: 'Force Gurkha 4x4',
      officers: ['Inspector C. Elango', 'Constable J. Babu'],
      lat: 11.3550,
      lng: 77.7080,
      speedKmH: 55,
      status: 'PATROLLING',
      radioChannel: 'VHF-158.30 MHz (Highway)',
      state: 'Tamil Nadu',
      city: 'Erode',
      tacticalClass: 'HIGHWAY',
    },
  ],
  'Salem': [
    {
      id: 'tn-sl-02',
      unitCode: 'SL-02',
      name: 'New Bus Stand Surveillance PCR',
      callsign: 'SALEM-EAGLE',
      vehicleType: 'Toyota Innova Crysta',
      officers: ['Inspector G. Vasanth', 'Constable R. Vignesh'],
      lat: 11.6660,
      lng: 78.1310,
      speedKmH: 48,
      status: 'PATROLLING',
      radioChannel: 'VHF-156.40 MHz (Salem City)',
      state: 'Tamil Nadu',
      city: 'Salem',
      tacticalClass: 'PATROL',
    },
    {
      id: 'tn-sl-05',
      unitCode: 'SL-05',
      name: 'Fairlands Rapid Interceptor',
      callsign: 'FAIRLANDS-5',
      vehicleType: 'Mahindra Scorpio-N Interceptor',
      officers: ['SI N. Moorthy', 'Constable T. Sivakumar'],
      lat: 11.6710,
      lng: 78.1410,
      speedKmH: 56,
      status: 'PATROLLING',
      radioChannel: 'VHF-156.65 MHz (North Range)',
      state: 'Tamil Nadu',
      city: 'Salem',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'tn-sl-09',
      unitCode: 'SL-09',
      name: 'Suramangalam QRT Striker',
      callsign: 'SURAM-9',
      vehicleType: 'Force Gurkha 4x4 QRT',
      officers: ['Inspector B. Anbalagan', 'QRT Commando M. Ravi'],
      lat: 11.6590,
      lng: 78.1210,
      speedKmH: 50,
      status: 'PATROLLING',
      radioChannel: 'VHF-156.90 MHz (QRT Command)',
      state: 'Tamil Nadu',
      city: 'Salem',
      tacticalClass: 'QRT',
    },
    {
      id: 'tn-sl-14',
      unitCode: 'SL-14',
      name: 'Four Roads Patrol Squad',
      callsign: 'FOUR-ROADS-14',
      vehicleType: 'Tata Safari Stealth',
      officers: ['SI E. Loganathan', 'Constable P. Gowtham'],
      lat: 11.6550,
      lng: 78.1490,
      speedKmH: 40,
      status: 'PATROLLING',
      radioChannel: 'VHF-157.10 MHz (Central)',
      state: 'Tamil Nadu',
      city: 'Salem',
      tacticalClass: 'PATROL',
    },
  ],
  'Coimbatore': [
    {
      id: 'tn-cbe-01',
      unitCode: 'CBE-01',
      name: 'Gandhipuram Interceptor-1',
      callsign: 'KOVAI-CHETTAH',
      vehicleType: 'Toyota Innova Crysta Interceptor',
      officers: ['Inspector K. Sivasankaran', 'Constable S. Aravind'],
      lat: 11.0150,
      lng: 76.9640,
      speedKmH: 54,
      status: 'PATROLLING',
      radioChannel: 'VHF-155.20 MHz (City Core)',
      state: 'Tamil Nadu',
      city: 'Coimbatore',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'tn-cbe-04',
      unitCode: 'CBE-04',
      name: 'RS Puram Tactical Squad',
      callsign: 'RS-PURAM-4',
      vehicleType: 'Mahindra Scorpio-N',
      officers: ['SI A. Dharmaraj', 'Constable V. Santhosh'],
      lat: 11.0060,
      lng: 76.9450,
      speedKmH: 45,
      status: 'PATROLLING',
      radioChannel: 'VHF-155.45 MHz (West Range)',
      state: 'Tamil Nadu',
      city: 'Coimbatore',
      tacticalClass: 'PATROL',
    },
    {
      id: 'tn-cbe-07',
      unitCode: 'CBE-07',
      name: 'Peelamedu Tech Corridor QRT',
      callsign: 'PEELAMEDU-7',
      vehicleType: 'Force Gurkha 4x4 QRT',
      officers: ['Inspector P. Jaikumar', 'QRT Commando K. Prakash'],
      lat: 11.0250,
      lng: 77.0010,
      speedKmH: 52,
      status: 'PATROLLING',
      radioChannel: 'VHF-155.80 MHz (IT Corridor)',
      state: 'Tamil Nadu',
      city: 'Coimbatore',
      tacticalClass: 'QRT',
    },
    {
      id: 'tn-cbe-11',
      unitCode: 'CBE-11',
      name: 'Ukkadam Transit Interceptor',
      callsign: 'UKKADAM-11',
      vehicleType: 'Tata Safari Stealth',
      officers: ['SI M. Karunakaran', 'Constable T. Gokul'],
      lat: 10.9860,
      lng: 76.9590,
      speedKmH: 48,
      status: 'PATROLLING',
      radioChannel: 'VHF-156.05 MHz (Transit)',
      state: 'Tamil Nadu',
      city: 'Coimbatore',
      tacticalClass: 'HIGHWAY',
    },
  ],
  'Chennai': [
    {
      id: 'tn-chn-01',
      unitCode: 'CHN-01',
      name: 'Greater Chennai PCR (T. Nagar)',
      callsign: 'CHENNAI-HAWK',
      vehicleType: 'Toyota Innova Crysta Interceptor',
      officers: ['Inspector R. Parthiban', 'Constable M. Kishore'],
      lat: 13.0380,
      lng: 80.2310,
      speedKmH: 48,
      status: 'PATROLLING',
      radioChannel: 'VHF-154.10 MHz (South Range)',
      state: 'Tamil Nadu',
      city: 'Chennai',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'tn-chn-05',
      unitCode: 'CHN-05',
      name: 'Anna Nagar Flying Squad',
      callsign: 'ANNA-NAGAR-5',
      vehicleType: 'Mahindra Scorpio-N',
      officers: ['SI D. Sundaram', 'Constable K. Vinoth'],
      lat: 13.0820,
      lng: 80.2090,
      speedKmH: 42,
      status: 'PATROLLING',
      radioChannel: 'VHF-154.35 MHz (West Range)',
      state: 'Tamil Nadu',
      city: 'Chennai',
      tacticalClass: 'PATROL',
    },
    {
      id: 'tn-chn-09',
      unitCode: 'CHN-09',
      name: 'OMR Cyber Highway QRT',
      callsign: 'OMR-CYBER-9',
      vehicleType: 'Force Gurkha 4x4 QRT',
      officers: ['Inspector S. Ramachandran', 'QRT Commando G. Harish'],
      lat: 12.9390,
      lng: 80.2340,
      speedKmH: 58,
      status: 'PATROLLING',
      radioChannel: 'VHF-154.70 MHz (Cyber Corridor)',
      state: 'Tamil Nadu',
      city: 'Chennai',
      tacticalClass: 'QRT',
    },
    {
      id: 'tn-chn-14',
      unitCode: 'CHN-14',
      name: 'Central Station Terminal Interceptor',
      callsign: 'CENTRAL-14',
      vehicleType: 'Tata Safari Stealth',
      officers: ['SI V. Devaraj', 'Constable N. Surya'],
      lat: 13.0790,
      lng: 80.2720,
      speedKmH: 44,
      status: 'PATROLLING',
      radioChannel: 'VHF-154.90 MHz (Central Div)',
      state: 'Tamil Nadu',
      city: 'Chennai',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'tn-chn-18',
      unitCode: 'CHN-18',
      name: 'Koyambedu Rapid Strike PCR',
      callsign: 'KOYAMBEDU-18',
      vehicleType: 'Mahindra Bolero Neo',
      officers: ['SI P. Ananthan', 'Constable B. Vijay'],
      lat: 13.0660,
      lng: 80.1880,
      speedKmH: 46,
      status: 'PATROLLING',
      radioChannel: 'VHF-155.05 MHz (Wholesale Grid)',
      state: 'Tamil Nadu',
      city: 'Chennai',
      tacticalClass: 'PATROL',
    },
  ],
  'Bangalore': [
    {
      id: 'ka-blr-01',
      unitCode: 'BLR-01',
      name: 'Hoysala-1 MG Road Strike',
      callsign: 'HOYSALA-1',
      vehicleType: 'Toyota Innova Crysta Interceptor',
      officers: ['Inspector Chetan Kumar', 'Constable Praveen Gowda'],
      lat: 12.9750,
      lng: 77.6080,
      speedKmH: 50,
      status: 'PATROLLING',
      radioChannel: 'VHF-151.20 MHz (Central Command)',
      state: 'Karnataka',
      city: 'Bangalore',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'ka-blr-04',
      unitCode: 'BLR-04',
      name: 'Cheetah-3 Koramangala Patrol',
      callsign: 'CHEETAH-3',
      vehicleType: 'Mahindra Scorpio-N',
      officers: ['SI Ramesh Rao', 'Constable Manjunath B'],
      lat: 12.9340,
      lng: 77.6250,
      speedKmH: 44,
      status: 'PATROLLING',
      radioChannel: 'VHF-151.45 MHz (South Range)',
      state: 'Karnataka',
      city: 'Bangalore',
      tacticalClass: 'PATROL',
    },
    {
      id: 'ka-blr-09',
      unitCode: 'BLR-09',
      name: 'Garuda Cyber Tactical QRT',
      callsign: 'GARUDA-QRT',
      vehicleType: 'Force Gurkha 4x4 QRT',
      officers: ['Inspector Anand Murthy', 'Garuda Commando Deepak K'],
      lat: 12.9860,
      lng: 77.7420,
      speedKmH: 56,
      status: 'PATROLLING',
      radioChannel: 'VHF-151.80 MHz (Whitefield Hub)',
      state: 'Karnataka',
      city: 'Bangalore',
      tacticalClass: 'QRT',
    },
    {
      id: 'ka-blr-12',
      unitCode: 'BLR-12',
      name: 'Electronic City Express Interceptor',
      callsign: 'E-CITY-12',
      vehicleType: 'Tata Safari Stealth',
      officers: ['SI Suresh Hegde', 'Constable Kiran Kumar'],
      lat: 12.8450,
      lng: 77.6650,
      speedKmH: 52,
      status: 'PATROLLING',
      radioChannel: 'VHF-152.05 MHz (Expressway)',
      state: 'Karnataka',
      city: 'Bangalore',
      tacticalClass: 'HIGHWAY',
    },
  ],
  'Mumbai': [
    {
      id: 'mh-mum-01',
      unitCode: 'MUM-01',
      name: 'BKC Financial District QRT',
      callsign: 'BKC-MOBILE-1',
      vehicleType: 'Toyota Innova Crysta Interceptor',
      officers: ['Inspector Sachin Deshmukh', 'Constable Amol Shinde'],
      lat: 19.0680,
      lng: 72.8680,
      speedKmH: 50,
      status: 'PATROLLING',
      radioChannel: 'VHF-148.20 MHz (Financial Cyber)',
      state: 'Maharashtra',
      city: 'Mumbai',
      tacticalClass: 'QRT',
    },
    {
      id: 'mh-mum-05',
      unitCode: 'MUM-05',
      name: 'Nariman Point Strike Unit',
      callsign: 'SOUTH-MUM-5',
      vehicleType: 'Mahindra Scorpio-N',
      officers: ['SI Rajesh Sawant', 'Constable Nilesh Patil'],
      lat: 18.9280,
      lng: 72.8220,
      speedKmH: 42,
      status: 'PATROLLING',
      radioChannel: 'VHF-148.45 MHz (Zone 1)',
      state: 'Maharashtra',
      city: 'Mumbai',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'mh-mum-11',
      unitCode: 'MUM-11',
      name: 'Western Express Highway Interceptor',
      callsign: 'WEH-CHETAK',
      vehicleType: 'Tata Safari Stealth',
      officers: ['Inspector Vilas More', 'Constable Sunil Jadhav'],
      lat: 19.1150,
      lng: 72.8550,
      speedKmH: 58,
      status: 'PATROLLING',
      radioChannel: 'VHF-148.80 MHz (Highway)',
      state: 'Maharashtra',
      city: 'Mumbai',
      tacticalClass: 'HIGHWAY',
    },
    {
      id: 'mh-mum-16',
      unitCode: 'MUM-16',
      name: 'Nirbhaya Mobile Surveillance',
      callsign: 'NIRBHAYA-16',
      vehicleType: 'Maruti Suzuki Ertiga Police',
      officers: ['SI Pooja Gaikwad', 'Constable Kavita Pawar'],
      lat: 19.0210,
      lng: 72.8420,
      speedKmH: 40,
      status: 'PATROLLING',
      radioChannel: 'VHF-149.10 MHz (Central)',
      state: 'Maharashtra',
      city: 'Mumbai',
      tacticalClass: 'PATROL',
    },
  ],
  'Delhi': [
    {
      id: 'dl-del-01',
      unitCode: 'DL-01',
      name: 'PCR Eagle-1 Connaught Place',
      callsign: 'DELHI-EAGLE',
      vehicleType: 'Toyota Innova Crysta',
      officers: ['Inspector Virender Singh', 'Constable Amit Tanwar'],
      lat: 28.6320,
      lng: 77.2190,
      speedKmH: 48,
      status: 'PATROLLING',
      radioChannel: 'VHF-146.10 MHz (New Delhi Range)',
      state: 'Delhi NCR',
      city: 'Delhi',
      tacticalClass: 'PATROL',
    },
    {
      id: 'dl-del-04',
      unitCode: 'DL-04',
      name: 'Parakram Tactical QRT',
      callsign: 'PARAKRAM-4',
      vehicleType: 'Force Gurkha 4x4 QRT',
      officers: ['Inspector Kuldeep Yadav', 'Parakram Commando Sandeep Rathi'],
      lat: 28.5680,
      lng: 77.2250,
      speedKmH: 55,
      status: 'PATROLLING',
      radioChannel: 'VHF-146.40 MHz (Tactical Command)',
      state: 'Delhi NCR',
      city: 'Delhi',
      tacticalClass: 'QRT',
    },
    {
      id: 'dl-del-08',
      unitCode: 'DL-08',
      name: 'Outer Ring Highway Interceptor',
      callsign: 'RING-INTERCEPT',
      vehicleType: 'Mahindra Scorpio-N Interceptor',
      officers: ['SI Manoj Sharma', 'Constable Rohit Dahiya'],
      lat: 28.6980,
      lng: 77.1650,
      speedKmH: 56,
      status: 'PATROLLING',
      radioChannel: 'VHF-146.75 MHz (Outer Range)',
      state: 'Delhi NCR',
      city: 'Delhi',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'dl-del-12',
      unitCode: 'DL-12',
      name: 'Dwarka Cyber Corridor Strike',
      callsign: 'DWARKA-12',
      vehicleType: 'Tata Safari Stealth',
      officers: ['SI Ravinder Kumar', 'Constable Vikas Malik'],
      lat: 28.5850,
      lng: 77.0580,
      speedKmH: 50,
      status: 'PATROLLING',
      radioChannel: 'VHF-147.05 MHz (South West)',
      state: 'Delhi NCR',
      city: 'Delhi',
      tacticalClass: 'HIGHWAY',
    },
  ],
  'Hyderabad': [
    {
      id: 'tg-hyd-01',
      unitCode: 'HYD-01',
      name: 'Blue Colts-1 HITEC Cyber Hub',
      callsign: 'BLUE-COLTS-1',
      vehicleType: 'Toyota Innova Crysta Interceptor',
      officers: ['Inspector K. Srinivas Rao', 'Constable B. Mallesh'],
      lat: 17.4480,
      lng: 78.3780,
      speedKmH: 52,
      status: 'PATROLLING',
      radioChannel: 'VHF-150.15 MHz (Cyberabad IT)',
      state: 'Telangana',
      city: 'Hyderabad',
      tacticalClass: 'QRT',
    },
    {
      id: 'tg-hyd-05',
      unitCode: 'HYD-05',
      name: 'Rakshak Mobile Patrol (Banjara Hills)',
      callsign: 'RAKSHAK-5',
      vehicleType: 'Mahindra Scorpio-N',
      officers: ['SI G. Venkatesh', 'Constable Ch. Naresh'],
      lat: 17.4150,
      lng: 78.4410,
      speedKmH: 45,
      status: 'PATROLLING',
      radioChannel: 'VHF-150.40 MHz (West Zone)',
      state: 'Telangana',
      city: 'Hyderabad',
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: 'tg-hyd-09',
      unitCode: 'HYD-09',
      name: 'Gachibowli Highway Flying Squad',
      callsign: 'ORR-STRIKE-9',
      vehicleType: 'Tata Safari Stealth',
      officers: ['Inspector M. Prabhakar', 'Constable S. Vijay Kumar'],
      lat: 17.4390,
      lng: 78.3450,
      speedKmH: 56,
      status: 'PATROLLING',
      radioChannel: 'VHF-150.70 MHz (ORR Highway)',
      state: 'Telangana',
      city: 'Hyderabad',
      tacticalClass: 'HIGHWAY',
    },
  ],
};

// Universal Jurisdiction Fleet Resolver: Automatically adapts to any city or coordinates in India
export const getPatrolFleetForAtmOrCity = (
  targetAtm: ATMLocation | null,
  cityFilter: string,
  stateFilter: string = 'ALL'
): PatrolUnit[] => {
  // If state filter is selected (other than ALL)
  if (stateFilter !== 'ALL') {
    if (stateFilter === 'Karnataka') return STATE_PATROL_FLEETS['Bangalore'];
    if (stateFilter === 'Maharashtra') return STATE_PATROL_FLEETS['Mumbai'];
    if (stateFilter === 'Delhi NCR') return STATE_PATROL_FLEETS['Delhi'];
    if (stateFilter === 'Telangana') return STATE_PATROL_FLEETS['Hyderabad'];
  }

  const activeCity = targetAtm?.city || (cityFilter !== 'ALL' ? cityFilter : 'Tiruchengode');

  // Check if we have an exact city fleet registered
  if (STATE_PATROL_FLEETS[activeCity]) {
    return STATE_PATROL_FLEETS[activeCity];
  }

  // Universal Dynamic Generator: Orbit 1.2 to 2.8 km around any ATM in any state
  const baseLat = targetAtm ? targetAtm.latitude : 11.378;
  const baseLng = targetAtm ? targetAtm.longitude : 77.892;
  const stateName = activeCity.includes('Karur') || activeCity.includes('Namakkal')
    ? 'Tamil Nadu'
    : 'State Police Jurisdiction';

  return [
    {
      id: `patrol-auto-1-${activeCity}`,
      unitCode: `${activeCity.substring(0, 3).toUpperCase()}-01`,
      name: `${activeCity} Flying Interceptor-1`,
      callsign: `${activeCity.substring(0, 4).toUpperCase()}-ALPHA`,
      vehicleType: 'Toyota Innova Crysta Interceptor',
      officers: ['Inspector P. Raman', 'Constable K. Vignesh'],
      lat: Number((baseLat + 0.012).toFixed(5)),
      lng: Number((baseLng + 0.008).toFixed(5)),
      speedKmH: 52,
      status: 'PATROLLING',
      radioChannel: `VHF-155.40 MHz`,
      state: stateName,
      city: activeCity,
      tacticalClass: 'INTERCEPTOR',
    },
    {
      id: `patrol-auto-2-${activeCity}`,
      unitCode: `${activeCity.substring(0, 3).toUpperCase()}-04`,
      name: `${activeCity} Rapid QRT Striker`,
      callsign: `${activeCity.substring(0, 4).toUpperCase()}-BRAVO`,
      vehicleType: 'Mahindra Scorpio-N QRT',
      officers: ['SI S. Chandran', 'QRT Commando M. Dinesh'],
      lat: Number((baseLat - 0.011).toFixed(5)),
      lng: Number((baseLng - 0.009).toFixed(5)),
      speedKmH: 48,
      status: 'PATROLLING',
      radioChannel: `VHF-155.65 MHz`,
      state: stateName,
      city: activeCity,
      tacticalClass: 'QRT',
    },
    {
      id: `patrol-auto-3-${activeCity}`,
      unitCode: `${activeCity.substring(0, 3).toUpperCase()}-07`,
      name: `${activeCity} City Core Patrol`,
      callsign: `${activeCity.substring(0, 4).toUpperCase()}-CHARLIE`,
      vehicleType: 'Tata Safari Stealth',
      officers: ['SI V. Murugesan', 'Constable R. Ajith'],
      lat: Number((baseLat + 0.009).toFixed(5)),
      lng: Number((baseLng - 0.014).toFixed(5)),
      speedKmH: 40,
      status: 'PATROLLING',
      radioChannel: `VHF-155.85 MHz`,
      state: stateName,
      city: activeCity,
      tacticalClass: 'PATROL',
    },
    {
      id: `patrol-auto-4-${activeCity}`,
      unitCode: `${activeCity.substring(0, 3).toUpperCase()}-11`,
      name: `${activeCity} Highway Express Interceptor`,
      callsign: `${activeCity.substring(0, 4).toUpperCase()}-DELTA`,
      vehicleType: 'Force Gurkha 4x4',
      officers: ['Inspector M. Selvam', 'Constable J. Anbu'],
      lat: Number((baseLat - 0.016).toFixed(5)),
      lng: Number((baseLng + 0.013).toFixed(5)),
      speedKmH: 55,
      status: 'PATROLLING',
      radioChannel: `VHF-156.10 MHz`,
      state: stateName,
      city: activeCity,
      tacticalClass: 'HIGHWAY',
    },
  ];
};

const DEFAULT_PATROL_UNITS: PatrolUnit[] = STATE_PATROL_FLEETS['Tiruchengode'];

export const GeoIntelligence: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialAccountId = searchParams.get('account_id') || '127';
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId);

  const [atms, setAtms] = useState<ATMLocation[]>([]);
  const [predictions, setPredictions] = useState<CashoutPrediction[]>([]);
  const [accounts, setAccounts] = useState<AccountRiskScore[]>([]);
  const [selectedAtm, setSelectedAtm] = useState<ATMLocation | null>(null);

  // Geofencing perimeter (2 km alert ring & 600m inner interception zone)
  const [showGeofencing, setShowGeofencing] = useState<boolean>(true);

  // Field Patrol Fleet, State Filter & Interception Dispatch states
  const [selectedStateFilter, setSelectedStateFilter] = useState<string>('ALL');
  const [patrolUnits, setPatrolUnits] = useState<PatrolUnit[]>(DEFAULT_PATROL_UNITS);
  const [dispatchedUnitId, setDispatchedUnitId] = useState<string | null>(null);
  const [interceptionSecondsLeft, setInterceptionSecondsLeft] = useState<number | null>(null);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [dispatchSuccessToast, setDispatchSuccessToast] = useState<string | null>(null);
  const [arrestConfirmed, setArrestConfirmed] = useState<boolean>(false);
  const [patrolDrawerOpen, setPatrolDrawerOpen] = useState<boolean>(true);

  // Patrol turn-by-turn road route states
  const [showPatrolRoute, setShowPatrolRoute] = useState<boolean>(true);
  const [selectedPatrolForRouteId, setSelectedPatrolForRouteId] = useState<string | null>(null);
  const [patrolRoadRoute, setPatrolRoadRoute] = useState<RoadRoute | null>(null);
  const [patrolRoutingLoading, setPatrolRoutingLoading] = useState<boolean>(false);

  // User location & Direction route states
  const [userLocation, setUserLocation] = useState<[number, number]>([11.3780, 77.8920]); // Command Center HQ in Tiruchengode
  const [userLocationName, setUserLocationName] = useState<string>('Investigator Command HQ (Tiruchengode)');
  const [showDirectionRoute, setShowDirectionRoute] = useState<boolean>(true);
  const [locatingUser, setLocatingUser] = useState<boolean>(false);
  const [fitRouteBounds, setFitRouteBounds] = useState<[[number, number], [number, number]] | null>(null);

  // Real turn-by-turn road route like Google Maps (From HQ/User to ATM)
  const [roadRoute, setRoadRoute] = useState<RoadRoute | null>(null);
  const [routingLoading, setRoutingLoading] = useState<boolean>(false);

  // Full Screen map state
  const [isMapFullscreen, setIsMapFullscreen] = useState<boolean>(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'PREDICTED' | 'HIGH_RISK'>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [mapLayer, setMapLayer] = useState<MapLayerType>('google-streets');

  // UI feedback states
  const [copiedGps, setCopiedGps] = useState<boolean>(false);
  const [alertSent, setAlertSent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Who Withdrew Money Forensic Intel states
  const [selectedWithdrawalIntel, setSelectedWithdrawalIntel] = useState<WithdrawalIntel | null>(null);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState<boolean>(false);
  const [loadingWithdrawal, setLoadingWithdrawal] = useState<boolean>(false);

  const handleOpenWithdrawalIntel = async (atmId?: number, accountId?: number) => {
    setLoadingWithdrawal(true);
    try {
      const data = await api.getWithdrawalIntel({
        atm_id: atmId,
        account_id: accountId || (selectedAccountId ? Number(selectedAccountId) : undefined),
        limit: 10
      });
      if (data && data.length > 0) {
        setSelectedWithdrawalIntel(data[0]);
        setShowWithdrawalModal(true);
      } else {
        const fallback = await api.getWithdrawalIntel({ limit: 5 });
        if (fallback && fallback.length > 0) {
          setSelectedWithdrawalIntel(fallback[0]);
          setShowWithdrawalModal(true);
        }
      }
    } catch (err) {
      console.error('Failed to load withdrawal intel:', err);
    } finally {
      setLoadingWithdrawal(false);
    }
  };

  const [mapCenter, setMapCenter] = useState<[number, number]>([11.38, 77.89]); // Default Erode/Tiruchengode center
  const [mapZoom, setMapZoom] = useState<number>(11);

  // ESC key listener for exiting full screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMapFullscreen) {
        setIsMapFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMapFullscreen]);

  // Synchronize patrol fleet whenever selected ATM, city filter, or state filter changes
  useEffect(() => {
    const fleet = getPatrolFleetForAtmOrCity(selectedAtm, cityFilter, selectedStateFilter);
    setPatrolUnits(fleet);
  }, [selectedAtm, cityFilter, selectedStateFilter]);

  // Dynamically calculate distance, ETA, bearing, and AI recommendation score for each patrol unit
  const computedPatrolUnits = React.useMemo(() => {
    if (!selectedAtm) return patrolUnits;

    // Calculate metrics for each unit
    const scored = patrolUnits.map((unit) => {
      const dist = calculateDistanceKm(unit.lat, unit.lng, selectedAtm.latitude, selectedAtm.longitude);
      const bearing = calculateBearing(unit.lat, unit.lng, selectedAtm.latitude, selectedAtm.longitude);
      const direction = getCompassDirection(bearing);
      
      // Emergency response ETA (speed adjusted + 1 min tactical launch)
      const effectiveSpeed = unit.speedKmH || 48;
      const eta = Math.max(Math.round((dist / effectiveSpeed) * 60) + 1, 2);

      // AI Tactical Scoring Matrix
      // 1. Distance penalty (faster response is prioritized)
      let score = 100 - (dist * 7.5);
      // 2. Tactical vehicle class bonus
      if (unit.tacticalClass === 'INTERCEPTOR') score += 12;
      else if (unit.tacticalClass === 'QRT') score += 8;
      else if (unit.tacticalClass === 'HIGHWAY') score += 5;
      else score += 2;
      // 3. Pursuit speed capability
      score += Math.round(((unit.speedKmH || 45) - 40) / 3);
      // Clamp between 15 and 99
      const aiScore = Math.max(15, Math.min(99, Math.round(score)));

      return {
        ...unit,
        distanceKm: dist,
        etaMinutes: eta,
        bearingDeg: bearing,
        compassDirection: direction,
        aiScore,
      };
    });

    // Sort primarily by AI Score descending (best interceptor first)
    scored.sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0));

    // Designate top unit as AI Recommended
    return scored.map((unit, idx) => {
      const isTop = idx === 0;
      let reason = '';
      if (isTop) {
        reason = `Top Interceptor: ~${unit.etaMinutes} min response via ${unit.compassDirection || 'SW'} approach corridor with ${unit.tacticalClass || 'Rapid'} pursuit capability.`;
      }
      return {
        ...unit,
        isRecommended: isTop,
        recommendationReason: isTop ? reason : undefined,
      };
    });
  }, [patrolUnits, selectedAtm]);

  const recommendedPatrol = computedPatrolUnits.find((u) => u.isRecommended) || computedPatrolUnits[0] || null;
  const nearestPatrol = computedPatrolUnits.length > 0 ? computedPatrolUnits[0] : null;
  const activeDispatchedUnit = computedPatrolUnits.find((u) => u.id === dispatchedUnitId) || null;

  // Active patrol unit for displaying turn-by-turn road route to ATM
  const activePatrolForRoute = React.useMemo(() => {
    if (!computedPatrolUnits || computedPatrolUnits.length === 0) return null;
    if (selectedPatrolForRouteId) {
      const found = computedPatrolUnits.find((p) => p.id === selectedPatrolForRouteId);
      if (found) return found;
    }
    return recommendedPatrol || computedPatrolUnits[0];
  }, [computedPatrolUnits, selectedPatrolForRouteId, recommendedPatrol]);

  // Interception countdown timer
  useEffect(() => {
    if (interceptionSecondsLeft === null || interceptionSecondsLeft <= 0) return;
    const interval = setInterval(() => {
      setInterceptionSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [interceptionSecondsLeft]);

  // 1-Click Dispatch Nearest/Recommended Field Patrol Unit
  const handleDispatchNearestPatrol = (unitToDispatch?: PatrolUnit) => {
    const target = unitToDispatch || recommendedPatrol || nearestPatrol;
    if (!target || !selectedAtm) return;

    playPoliceSirenTone();
    setDispatchedUnitId(target.id);
    setPatrolUnits((prev) =>
      prev.map((u) =>
        u.id === target.id ? { ...u, status: 'DISPATCHED' } : u
      )
    );
    const etaSecs = (target.etaMinutes || 3) * 60;
    setInterceptionSecondsLeft(etaSecs);
    setArrestConfirmed(false);
    setIsDispatchModalOpen(true);
    setDispatchSuccessToast(
      `🚨 EMERGENCY DISPATCH: ${target.unitCode} (${target.callsign}) routed to ${selectedAtm.name} • ETA ${target.etaMinutes || 3} min!`
    );
    setTimeout(() => setDispatchSuccessToast(null), 6000);
  };

  const handleStandDownPatrol = () => {
    if (!dispatchedUnitId) return;
    setPatrolUnits((prev) =>
      prev.map((u) =>
        u.id === dispatchedUnitId ? { ...u, status: 'PATROLLING' } : u
      )
    );
    setDispatchedUnitId(null);
    setInterceptionSecondsLeft(null);
    setArrestConfirmed(false);
  };

  const handleConfirmArrest = () => {
    setArrestConfirmed(true);
    setInterceptionSecondsLeft(0);
  };

  // Fetch real turn-by-turn road route from active Patrol Unit to ATM via OSRM
  useEffect(() => {
    if (!selectedAtm || !activePatrolForRoute || !showPatrolRoute) {
      setPatrolRoadRoute(null);
      return;
    }

    let isMounted = true;
    const loadPatrolRoadRoute = async () => {
      setPatrolRoutingLoading(true);
      const start: [number, number] = [activePatrolForRoute.lat, activePatrolForRoute.lng];
      const end: [number, number] = [selectedAtm.latitude, selectedAtm.longitude];

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM patrol route request failed');
        const data = await res.json();

        if (isMounted && data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const coords: [number, number][] = route.geometry.coordinates.map(
            ([lon, lat]: [number, number]) => [lat, lon]
          );

          if (coords.length >= 2) {
            setPatrolRoadRoute({
              coordinates: coords,
              distanceKm: Number((route.distance / 1000).toFixed(1)),
              durationMinutes: Math.max(Math.round(route.duration / 60), 1),
              isRealRoad: true,
            });
            setPatrolRoutingLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('OSRM patrol routing fallback to corridor:', err);
      }

      // Fallback straight line corridor
      if (isMounted) {
        const directDist = calculateDistanceKm(start[0], start[1], end[0], end[1]);
        setPatrolRoadRoute({
          coordinates: [start, end],
          distanceKm: directDist,
          durationMinutes: Math.max(Math.round(directDist * 1.6), 2),
          isRealRoad: false,
        });
        setPatrolRoutingLoading(false);
      }
    };

    loadPatrolRoadRoute();
    return () => {
      isMounted = false;
    };
  }, [activePatrolForRoute?.id, selectedAtm?.id, showPatrolRoute]);

  // Fetch real Google Maps turn-by-turn road directions via OSRM
  useEffect(() => {
    if (!selectedAtm) {
      setRoadRoute(null);
      return;
    }

    let isMounted = true;
    const loadRoadRoute = async () => {
      setRoutingLoading(true);
      const start = userLocation;
      const end: [number, number] = [selectedAtm.latitude, selectedAtm.longitude];

      try {
        // OSRM expects longitude,latitude format
        const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM routing request failed');
        const data = await res.json();

        if (isMounted && data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          // Convert [lon, lat] array to Leaflet [lat, lon] array
          const coords: [number, number][] = route.geometry.coordinates.map(
            ([lon, lat]: [number, number]) => [lat, lon]
          );

          if (coords.length >= 2) {
            setRoadRoute({
              coordinates: coords,
              distanceKm: Number((route.distance / 1000).toFixed(1)),
              durationMinutes: Math.max(Math.round(route.duration / 60), 1),
              isRealRoad: true,
            });
            setRoutingLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('OSRM road directions fallback to direct corridor:', err);
      }

      // Fallback straight line if OSRM unavailable
      if (isMounted) {
        const directDist = calculateDistanceKm(start[0], start[1], end[0], end[1]);
        setRoadRoute({
          coordinates: [start, end],
          distanceKm: directDist,
          durationMinutes: Math.max(Math.round(directDist * 2.2), 2),
          isRealRoad: false,
        });
        setRoutingLoading(false);
      }
    };

    loadRoadRoute();
    return () => {
      isMounted = false;
    };
  }, [userLocation, selectedAtm]);

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [atmList, accountList] = await Promise.all([
          api.getAllATMs(),
          api.getRiskScores(),
        ]);
        setAtms(atmList);
        setAccounts(accountList);

        // Load predictions for current account
        const preds = await api.getCashoutPredictions(selectedAccountId);
        setPredictions(preds);

        if (preds.length > 0) {
          const topPredAtm = atmList.find((a) => a.id === preds[0].atm_id) || {
            id: preds[0].atm_id,
            name: preds[0].name,
            location: preds[0].location,
            city: preds[0].city,
            latitude: preds[0].latitude,
            longitude: preds[0].longitude,
            risk_level: preds[0].risk_level,
          };
          setSelectedAtm(topPredAtm);
          setMapCenter([preds[0].latitude, preds[0].longitude]);
          setMapZoom(13);
        } else if (atmList.length > 0) {
          setSelectedAtm(atmList[0]);
        }
      } catch (err) {
        console.error('Failed to load geo intelligence data:', err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  const handleAccountChange = async (accId: string) => {
    setSelectedAccountId(accId);
    setSearchParams({ account_id: accId });
    try {
      const preds = await api.getCashoutPredictions(accId);
      setPredictions(preds);
      if (preds.length > 0) {
        const topPredAtm = atms.find((a) => a.id === preds[0].atm_id) || {
          id: preds[0].atm_id,
          name: preds[0].name,
          location: preds[0].location,
          city: preds[0].city,
          latitude: preds[0].latitude,
          longitude: preds[0].longitude,
          risk_level: preds[0].risk_level,
        };
        setSelectedAtm(topPredAtm);
        setMapCenter([preds[0].latitude, preds[0].longitude]);
        setMapZoom(14);
      }
    } catch (e) {
      console.error('Failed to update cashout predictions:', e);
    }
  };

  const handleSelectAtm = (atm: ATMLocation) => {
    setSelectedAtm(atm);
    setMapCenter([atm.latitude, atm.longitude]);
    setMapZoom(15);
  };

  const handleGetDeviceLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        setUserLocationName('My Current Live Location');
        setMapCenter(coords);
        setMapZoom(14);
        setLocatingUser(false);
      },
      (err) => {
        console.warn('Geolocation failed, falling back to central command HQ:', err);
        setUserLocation([11.3780, 77.8920]);
        setUserLocationName('Investigator Command HQ (Tiruchengode)');
        setMapCenter([11.3780, 77.8920]);
        setMapZoom(14);
        setLocatingUser(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleFitRouteBounds = () => {
    if (roadRoute && roadRoute.coordinates.length > 1) {
      const lats = roadRoute.coordinates.map((c) => c[0]);
      const lngs = roadRoute.coordinates.map((c) => c[1]);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);

      setFitRouteBounds([
        [minLat, minLng],
        [maxLat, maxLng],
      ]);
      setTimeout(() => setFitRouteBounds(null), 1000);
    } else if (selectedAtm) {
      setFitRouteBounds([
        [userLocation[0], userLocation[1]],
        [selectedAtm.latitude, selectedAtm.longitude],
      ]);
      setTimeout(() => setFitRouteBounds(null), 1000);
    }
  };

  const handleToggleMapFullscreen = () => {
    setIsMapFullscreen((prev) => !prev);
  };

  const handleCopyGps = (lat: number, lng: number) => {
    const text = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    navigator.clipboard.writeText(text);
    setCopiedGps(true);
    setTimeout(() => setCopiedGps(false), 2000);
  };

  const handleDispatchAlert = () => {
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 3500);
  };

  // Distinct cities for filter pills
  const availableCities = React.useMemo(() => {
    const set = new Set<string>();
    atms.forEach((a) => set.add(a.city));
    return Array.from(set);
  }, [atms]);

  // Filtered ATMs list
  const filteredAtms = React.useMemo(() => {
    return atms.filter((atm) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          atm.name.toLowerCase().includes(q) ||
          atm.location.toLowerCase().includes(q) ||
          atm.city.toLowerCase().includes(q);
        if (!match) return false;
      }

      // City filter
      if (cityFilter !== 'ALL' && atm.city !== cityFilter) {
        return false;
      }

      // Risk / Predicted filter
      if (riskFilter === 'PREDICTED') {
        return predictions.some((p) => p.atm_id === atm.id);
      }
      if (riskFilter === 'HIGH_RISK') {
        return atm.risk_level === 'HIGH';
      }

      return true;
    });
  }, [atms, predictions, searchQuery, riskFilter, cityFilter]);

  const selectedAccount = accounts.find((a) => String(a.account_id) === String(selectedAccountId));
  const selectedAtmPrediction = selectedAtm ? predictions.find((p) => p.atm_id === selectedAtm.id) : null;

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Title, Subtitle and Account Dropdown */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-0.5">
        <div className="min-w-0">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight whitespace-nowrap leading-tight">
            Geospatial Intelligence
          </h2>
          <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
            Heuristic ATM terminal cash-out prediction, geospatial corridor risk & terminal surveillance.
          </p>
        </div>

        {/* Account Selector */}
        <div className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-2xl border border-surface-border shadow-soft shrink-0 self-start xl:self-center">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Investigating Account:</label>
          <select
            value={selectedAccountId}
            onChange={(e) => handleAccountChange(e.target.value)}
            className="bg-transparent text-xs font-extrabold text-slate-800 focus:outline-none cursor-pointer pr-1"
          >
            {accounts.map((acc) => (
              <option key={acc.account_id} value={acc.account_id}>
                {acc.account_number} — {acc.name} (Risk: {acc.risk_score} [{acc.risk_level}])
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Target Context & Direction Dispatch Banner */}
      <div className="p-4 rounded-2xl bg-white border border-surface-border shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-lavender-iconBg text-brand-700 flex items-center justify-center font-extrabold text-sm shadow-2xs flex-shrink-0">
            {selectedAccount?.name ? selectedAccount.name.substring(0, 2).toUpperCase() : 'NX'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Investigating Target:</span>
              <span className="text-sm font-extrabold text-slate-900">{selectedAccount?.account_number || `NX-${selectedAccountId}`}</span>
              <span className="text-xs font-bold text-slate-600">({selectedAccount?.name || 'Account Holder'})</span>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">
                Primary Operational Hub: <strong className="text-slate-800 font-bold">{selectedAccount?.city || 'Tiruchengode / Erode'}</strong>
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-[#1A73E8] font-bold flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-[#1A73E8]" />
                <span>
                  {roadRoute
                    ? `Road Route: ${roadRoute.distanceKm} km (${roadRoute.durationMinutes} min drive)`
                    : 'Calculating Road Directions...'}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGetDeviceLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-colors shadow-2xs"
            title="Use your real device location for direction lines"
          >
            <Locate className={`w-3.5 h-3.5 ${locatingUser ? 'animate-spin' : ''}`} />
            <span>{locatingUser ? 'Locating...' : 'Set My Live Location'}</span>
          </button>

          <button
            onClick={() => navigate(`/money-flow?account_id=${selectedAccountId}`)}
            className="px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <span>View Money Flow</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Top 3 Predicted ATM Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
              Predicted ATM Cash-Out Targets
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
              Ranked by Velocity & Transit Distance
            </span>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            Click any card to inspect dossier, focus map & plot road directions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {predictions.map((pred, idx) => {
            const isCardSelected = selectedAtm?.id === pred.atm_id;
            const rankLabel = idx === 0 ? 'Primary Target' : idx === 1 ? 'Secondary Vector' : 'Perimeter Fallback';
            const rankBadgeColor =
              idx === 0
                ? 'bg-rose-500 text-white shadow-rose-500/20'
                : idx === 1
                  ? 'bg-amber-500 text-white shadow-amber-500/20'
                  : 'bg-indigo-600 text-white shadow-indigo-500/20';

            const cardDist = isCardSelected && roadRoute
              ? roadRoute.distanceKm
              : calculateDistanceKm(userLocation[0], userLocation[1], pred.latitude, pred.longitude);

            const cardDuration = isCardSelected && roadRoute
              ? `${roadRoute.durationMinutes} min`
              : `~${Math.max(Math.round(cardDist * 2.2), 2)} min`;

            return (
              <div
                key={pred.atm_id}
                onClick={() => {
                  const atmObj = atms.find((a) => a.id === pred.atm_id) || {
                    id: pred.atm_id,
                    name: pred.name,
                    location: pred.location,
                    city: pred.city,
                    latitude: pred.latitude,
                    longitude: pred.longitude,
                    risk_level: pred.risk_level,
                  };
                  handleSelectAtm(atmObj);
                }}
                className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${isCardSelected
                    ? 'border-[#1A73E8] ring-2 ring-[#1A73E8]/25 shadow-lg bg-blue-50/15'
                    : 'border-surface-border shadow-soft hover:shadow-card hover:border-brand-300'
                  }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black shadow-xs flex items-center gap-1 ${rankBadgeColor}`}>
                        <span>#{idx + 1}</span>
                        <span>{rankLabel}</span>
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                      {pred.confidence}% Match
                    </span>
                  </div>

                  {/* ATM Terminal Identity */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-lavender-iconBg text-brand-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {pred.name}
                      </h4>
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="leading-tight">{pred.location}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          City: {pred.city}
                        </span>
                        <span className="text-[11px] font-bold text-[#1A73E8] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Car className="w-3 h-3 text-[#1A73E8]" />
                          <span>{cardDist} km ({cardDuration})</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Key Parameter Rows (Neatly Aligned) */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-surface-bg/80 border border-slate-100 my-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Estimated Window
                      </span>
                      <div className="flex items-center gap-1 text-xs font-extrabold text-indigo-700 mt-0.5">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>{pred.time_window}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Terminal Threat
                      </span>
                      <div className="mt-0.5">
                        <RiskBadge level={pred.risk_level} />
                      </div>
                    </div>
                  </div>

                  {/* AI Prediction Rationale */}
                  <div className="space-y-1 text-xs text-slate-600 font-medium">
                    <div className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed text-[11px]">{pred.reason}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Button */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#1A73E8] flex items-center gap-1">
                    <Route className="w-3.5 h-3.5 text-[#1A73E8]" />
                    <span>{isCardSelected ? 'Active Google Maps Route' : 'Plot Road Directions'}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-brand-600" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Split Layout: Interactive Map (8 cols or Full Screen) + ATM Terminal Forensic Dossier (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Leaflet Map Container */}
        <div
          className={
            isMapFullscreen
              ? 'fixed inset-0 z-50 bg-white p-6 w-screen h-screen flex flex-col justify-between overflow-hidden shadow-2xl animate-in fade-in duration-200'
              : 'lg:col-span-8 bg-white rounded-3xl border border-surface-border shadow-soft p-5 overflow-hidden flex flex-col justify-between'
          }
        >
          {/* Map Top Controls Bar */}
          <div className="space-y-3 mb-3 pb-3 border-b border-surface-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Terminal Cash-Out Geo Heatmap
                </h3>
                <span className="text-xs text-slate-400 font-semibold">
                  ({filteredAtms.length} of {atms.length} Terminals)
                </span>
              </div>

              {/* Map Legend */}
              <div className="flex items-center gap-3 text-xs font-semibold flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow-xs"></span>
                  <span className="text-blue-700 font-bold">My HQ</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-1.5 bg-[#1A73E8] rounded-full shadow-xs"></span>
                  <span className="text-[#1A73E8] font-bold">HQ Route</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-1.5 bg-[#E11D48] rounded-full shadow-xs"></span>
                  <span className="text-rose-700 font-bold">Patrol Intercept</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full border border-dashed border-rose-500 bg-rose-500/10"></span>
                  <span className="text-rose-600 font-semibold">2km Geofence</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  <span className="text-slate-700 font-bold">Target (★)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="text-slate-600">High Risk</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-slate-600">Medium</span>
                </div>
              </div>
            </div>

            {/* Search, Route & Full Screen Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              {/* Search input */}
              <div className="relative min-w-[180px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ATMs or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-bg border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {/* Action Buttons & Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 1-Click Alert AI Recommended Patrol */}
                <button
                  onClick={() => handleDispatchNearestPatrol(recommendedPatrol || undefined)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-[#E11D48] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white transition-all flex items-center gap-1.5 shadow-xs shadow-rose-500/25 active:scale-95"
                  title="1-Click Dispatch the top-ranked AI Recommended Police Patrol"
                >
                  <Siren className="w-3.5 h-3.5 animate-bounce" />
                  <span>Alert Recommended</span>
                </button>

                {/* Patrol Road Route Toggle */}
                <button
                  onClick={() => setShowPatrolRoute(!showPatrolRoute)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shadow-2xs ${
                    showPatrolRoute
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle Police Patrol turn-by-turn road route"
                >
                  <Navigation className="w-3.5 h-3.5 text-rose-600" />
                  <span>{showPatrolRoute ? 'Patrol Road: ON' : 'Patrol Road: OFF'}</span>
                </button>

                {/* Geofence Perimeter Toggle */}
                <button
                  onClick={() => setShowGeofencing(!showGeofencing)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shadow-2xs ${
                    showGeofencing
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle 2 km dynamic geofencing ring"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>{showGeofencing ? 'Geofence: 2km' : 'Geofence: OFF'}</span>
                </button>

                {/* HQ Direction Route Toggle */}
                <button
                  onClick={() => setShowDirectionRoute(!showDirectionRoute)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shadow-2xs ${
                    showDirectionRoute
                      ? 'bg-[#1A73E8] text-white border-[#1A73E8]'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle real road directions from Command HQ"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>{showDirectionRoute ? 'HQ Route: ON' : 'HQ Route: OFF'}</span>
                </button>

                {/* My Location / Locate Me Button */}
                <button
                  onClick={handleGetDeviceLocation}
                  className="px-2.5 py-1.5 rounded-xl bg-surface-bg hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                  title="Center on My Location"
                >
                  <Locate className={`w-3.5 h-3.5 text-blue-600 ${locatingUser ? 'animate-spin' : ''}`} />
                  <span>HQ GPS</span>
                </button>

                {/* Map Layer Mode Switcher (Google Maps / Satellite / Terrain / OSM) */}
                <div className="flex items-center rounded-xl bg-slate-100 p-0.5 border border-slate-200 shadow-2xs">
                  {(['google-streets', 'google-hybrid', 'google-terrain', 'osm'] as MapLayerType[]).map((layerKey) => (
                    <button
                      key={layerKey}
                      type="button"
                      onClick={() => setMapLayer(layerKey)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                        mapLayer === layerKey
                          ? 'bg-white text-brand-700 shadow-xs ring-1 ring-black/5'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title={`Switch to ${MAP_LAYERS[layerKey].name}`}
                    >
                      {layerKey === 'google-streets' && <Layers className="w-3 h-3 text-blue-600" />}
                      <span>{MAP_LAYERS[layerKey].label}</span>
                    </button>
                  ))}
                </div>

                {/* Risk Filters */}
                <button
                  onClick={() => setRiskFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    riskFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'bg-surface-bg text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All ({atms.length || 30})
                </button>
                <button
                  onClick={() => setRiskFilter('PREDICTED')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    riskFilter === 'PREDICTED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-surface-bg text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Targets ({predictions.length || 3})
                </button>

                {/* Fit Road Route Bounds Button */}
                {selectedAtm && (
                  <button
                    onClick={handleFitRouteBounds}
                    className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                    title="Fit Full Road Route into View"
                  >
                    <Compass className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Full Screen Toggle Button */}
                <button
                  onClick={handleToggleMapFullscreen}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 shadow-2xs ${
                    isMapFullscreen
                      ? 'bg-brand-600 text-white border-brand-600 shadow-brand-500/25 hover:bg-brand-700'
                      : 'bg-surface-bg hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                  title={isMapFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen Map'}
                >
                  {isMapFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                  <span>{isMapFullscreen ? 'Exit' : 'Full Screen'}</span>
                </button>
              </div>
            </div>

            {/* Pan-India Police Jurisdiction & State Filter Row */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs border-t border-slate-100">
              <span className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider mr-1 flex items-center gap-1.5">
                <PoliceCarBadge size="sm" />
                <span>State Police Fleet:</span>
              </span>
              {(['ALL', 'Tamil Nadu', 'Karnataka', 'Maharashtra', 'Delhi NCR', 'Telangana'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStateFilter(st)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all ${
                    selectedStateFilter === st
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Auto-Detect Jurisdiction' : st}
                </button>
              ))}
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">ATM City:</span>
              <button
                onClick={() => setCityFilter('ALL')}
                className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                  cityFilter === 'ALL'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Cities
              </button>
              {availableCities.map((city) => (
                <button
                  key={city}
                  onClick={() => setCityFilter(city)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold ${
                    cityFilter === city
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* Leaflet Map Canvas */}
          <div
            className={`w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative z-0 ${
              isMapFullscreen ? 'flex-1 my-2 min-h-[calc(100vh-180px)]' : 'h-[520px]'
            }`}
          >
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              scrollWheelZoom={true}
              style={{ height: '100%', width: '100%' }}
            >
              <MapFlyTo center={mapCenter} zoom={mapZoom} />
              <MapFitBounds bounds={fitRouteBounds} />
              <MapResizeHandler isFullscreen={isMapFullscreen} />

              {/* Dynamic Map Tile Layer (Google Maps / Satellite / Terrain / OSM) */}
              <TileLayer
                key={mapLayer}
                attribution={MAP_LAYERS[mapLayer].attribution}
                url={MAP_LAYERS[mapLayer].url}
                maxZoom={MAP_LAYERS[mapLayer].maxZoom || 20}
              />

              {/* 1. Geofencing Perimeter Rings around Selected ATM */}
              {showGeofencing && selectedAtm && (
                <>
                  {/* 2.0 km Outer Alert Perimeter */}
                  <Circle
                    center={[selectedAtm.latitude, selectedAtm.longitude]}
                    radius={2000}
                    pathOptions={{
                      color: '#E11D48',
                      fillColor: '#E11D48',
                      fillOpacity: 0.05,
                      weight: 1.5,
                      dashArray: '6, 6',
                    }}
                  />
                  {/* 600m Inner Tactical Interception Zone */}
                  <Circle
                    center={[selectedAtm.latitude, selectedAtm.longitude]}
                    radius={600}
                    pathOptions={{
                      color: '#E11D48',
                      fillColor: '#E11D48',
                      fillOpacity: 0.14,
                      weight: 2,
                    }}
                  />
                </>
              )}

              {/* 2. "My Location / Command HQ" Origin Marker */}
              <Marker position={userLocation} icon={createMyLocationIcon()}>
                <Popup>
                  <div className="p-2 font-sans max-w-xs">
                    <div className="flex items-center gap-1.5 text-xs font-black text-blue-700 mb-1">
                      <Locate className="w-4 h-4" />
                      <span>{userLocationName}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mb-1">
                      Origin point for road direction routing to ATM cash-out nodes.
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono">
                      GPS: {userLocation[0].toFixed(5)}° N, {userLocation[1].toFixed(5)}° E
                    </div>
                  </div>
                </Popup>
              </Marker>

              {/* 3. Real Google Maps Road-Following Blue Line (OSRM turn-by-turn from HQ) */}
              {showDirectionRoute && selectedAtm && roadRoute && roadRoute.coordinates.length >= 2 && (
                <>
                  {/* Glowing outer aura */}
                  <Polyline
                    key={`route-glow-${selectedAtm.id}-${roadRoute.coordinates.length}`}
                    positions={roadRoute.coordinates}
                    pathOptions={{
                      color: '#60A5FA',
                      weight: 9,
                      opacity: 0.4,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />

                  {/* Primary Solid Vibrant Blue Road Direction Line */}
                  <Polyline
                    key={`route-solid-${selectedAtm.id}-${roadRoute.coordinates.length}`}
                    positions={roadRoute.coordinates}
                    pathOptions={{
                      color: '#1A73E8', // Google Maps Iconic Blue
                      weight: 5,
                      opacity: 0.95,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />

                  {/* Floating distance/time pill at the HQ road route midpoint */}
                  <Marker
                    position={
                      roadRoute.coordinates[Math.floor(roadRoute.coordinates.length / 2)]
                    }
                    icon={L.divIcon({
                      html: `
                        <div style="transform: translate(-50%, -50%);" class="bg-[#1A73E8] text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xl border-2 border-white whitespace-nowrap flex items-center gap-1.5 cursor-default select-none">
                          <span>🚗</span>
                          <span>HQ Route: ${roadRoute.durationMinutes} min (${roadRoute.distanceKm} km)</span>
                        </div>
                      `,
                      className: 'route-midpoint-badge',
                      iconSize: [0, 0],
                    })}
                  />
                </>
              )}

              {/* 4. Real Turn-by-Turn Road Route from Active Patrol Unit to ATM (OSRM geometry) */}
              {showPatrolRoute && selectedAtm && activePatrolForRoute && patrolRoadRoute && patrolRoadRoute.coordinates.length >= 2 && (
                <>
                  {/* Outer Crimson Aura */}
                  <Polyline
                    key={`patrol-glow-${activePatrolForRoute.id}-${selectedAtm.id}-${patrolRoadRoute.coordinates.length}`}
                    positions={patrolRoadRoute.coordinates}
                    pathOptions={{
                      color: '#FDA4AF',
                      weight: 8,
                      opacity: 0.5,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />

                  {/* Solid Tactical Crimson Interception Line */}
                  <Polyline
                    key={`patrol-solid-${activePatrolForRoute.id}-${selectedAtm.id}-${patrolRoadRoute.coordinates.length}`}
                    positions={patrolRoadRoute.coordinates}
                    pathOptions={{
                      color: '#E11D48',
                      weight: 4.5,
                      opacity: 0.95,
                      lineCap: 'round',
                      lineJoin: 'round',
                    }}
                  />

                  {/* Patrol Route Midpoint ETA badge */}
                  <Marker
                    position={
                      patrolRoadRoute.coordinates[Math.floor(patrolRoadRoute.coordinates.length / 2)]
                    }
                    icon={L.divIcon({
                      html: `
                        <div style="transform: translate(-50%, -50%);" class="bg-[#E11D48] text-white font-black text-[10px] px-2.5 py-1 rounded-full shadow-xl border-2 border-white whitespace-nowrap flex items-center gap-1 cursor-default select-none animate-pulse">
                          <span>🚨</span>
                          <span>${activePatrolForRoute.unitCode} Corridor: ${patrolRoadRoute.durationMinutes} min (${patrolRoadRoute.distanceKm} km)</span>
                        </div>
                      `,
                      className: 'patrol-route-midpoint-badge',
                      iconSize: [0, 0],
                    })}
                  />
                </>
              )}

              {/* Perimeter blue direction lines to secondary predicted cash-out ATMs */}
              {showDirectionRoute &&
                predictions
                  .filter((p) => p.atm_id !== selectedAtm?.id)
                  .map((p) => (
                    <Polyline
                      key={`perimeter-route-${p.atm_id}`}
                      positions={[
                        [userLocation[0], userLocation[1]],
                        [p.latitude, p.longitude],
                      ]}
                      pathOptions={{
                        color: '#60A5FA',
                        weight: 2.5,
                        dashArray: '8, 8',
                        opacity: 0.65,
                        lineCap: 'round',
                      }}
                    />
                  ))}

              {/* 5. ATM Markers */}
              {filteredAtms.map((atm) => {
                const matchedPred = predictions.find((p) => p.atm_id === atm.id);
                const isPredicted = Boolean(matchedPred);
                const isSelected = selectedAtm?.id === atm.id;

                return (
                  <Marker
                    key={atm.id}
                    position={[atm.latitude, atm.longitude]}
                    icon={createMarkerIcon(atm.risk_level, isPredicted, isSelected, matchedPred?.confidence)}
                    eventHandlers={{
                      click: () => {
                        setSelectedAtm(atm);
                      },
                    }}
                  >
                    <Popup>
                      <div className="p-2 font-sans max-w-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-black text-slate-900">{atm.name}</span>
                          <RiskBadge level={atm.risk_level} />
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium mb-1.5">
                          {atm.location}, {atm.city}
                        </p>

                        {isPredicted && matchedPred && (
                          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 mb-2 space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-rose-700">
                              <span>Predicted Cash-Out</span>
                              <span>{matchedPred.confidence}% Conf</span>
                            </div>
                            <div className="text-[10px] text-rose-600 font-medium">
                              Window: {matchedPred.time_window}
                            </div>
                          </div>
                        )}

                        <div className="text-[10px] text-blue-700 font-bold mb-2 flex items-center gap-1">
                          <Car className="w-3.5 h-3.5" />
                          <span>
                            {isSelected && roadRoute
                              ? `Road Distance: ${roadRoute.distanceKm} km (${roadRoute.durationMinutes} min drive)`
                              : `Direct Distance: ${calculateDistanceKm(userLocation[0], userLocation[1], atm.latitude, atm.longitude)} km`}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <button
                            onClick={() => handleSelectAtm(atm)}
                            className="w-full py-1.5 rounded-lg bg-[#1A73E8] text-white text-[11px] font-bold hover:bg-blue-700 transition-colors"
                          >
                            Plot Google Maps Road Directions
                          </button>

                          <button
                            onClick={() => handleOpenWithdrawalIntel(atm.id)}
                            className="w-full py-1.5 rounded-lg bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Who Withdrew Money? (CCTV Intel)</span>
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              {/* 6. Police Patrol Fleet Markers */}
              {computedPatrolUnits.map((unit) => {
                const isDispatched = dispatchedUnitId === unit.id;
                const isRouteActive = activePatrolForRoute?.id === unit.id;

                return (
                  <Marker
                    key={unit.id}
                    position={[unit.lat, unit.lng]}
                    icon={createPatrolMarkerIcon(unit, Boolean(unit.isRecommended), isDispatched)}
                    eventHandlers={{
                      click: () => {
                        setSelectedPatrolForRouteId(unit.id);
                      },
                    }}
                  >
                    <Popup>
                      <div className="p-2 font-sans max-w-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <PoliceCarBadge size="sm" />
                            <span className="text-xs font-black text-slate-900">{unit.unitCode}</span>
                            <span className="text-[10px] font-bold text-slate-500">({unit.callsign})</span>
                          </div>
                          {unit.isRecommended && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-extrabold border border-rose-200">
                              ★ AI PICK
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-semibold text-slate-700 mb-1">
                          {unit.name} • <span className="text-slate-500">{unit.vehicleType}</span>
                        </div>

                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 mb-2 space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-600">
                            <span>Class: <strong>{unit.tacticalClass}</strong></span>
                            <span className="font-mono text-indigo-700 font-bold">{unit.radioChannel}</span>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-600">
                            <span>Patrol Speed: <strong>{unit.speedKmH} km/h</strong></span>
                            <span>Jurisdiction: <strong>{unit.city} ({unit.state})</strong></span>
                          </div>
                          {unit.distanceKm !== undefined && (
                            <div className="flex justify-between text-[11px] font-extrabold text-rose-700 pt-1 border-t border-slate-200">
                              <span>To Target ATM:</span>
                              <span>
                                {unit.distanceKm} km (~{unit.etaMinutes} min • {unit.compassDirection || 'SW'})
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 mb-2">
                          Crew: {unit.officers.join(', ')}
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setSelectedPatrolForRouteId(unit.id)}
                            className="flex-1 py-1.5 rounded-lg bg-blue-50 text-[#1A73E8] border border-blue-200 text-[10px] font-bold hover:bg-blue-100 transition-colors"
                          >
                            Plot Route
                          </button>
                          <button
                            onClick={() => handleDispatchNearestPatrol(unit)}
                            className="flex-1 py-1.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 transition-colors"
                          >
                            Alert / Dispatch
                          </button>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          {/* Footer Info & Fullscreen ESC hint */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Solid blue line traces HQ directions; crimson line traces AI patrol interception corridor.</span>
              {isMapFullscreen && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                  Press ESC or click button to exit full screen
                </span>
              )}
            </div>
            <span>
              {mapLayer.startsWith('google') ? 'Cartography & Imagery © Google Maps 2026' : 'Copyright © OpenStreetMap contributors 2026'} • Nexora Geo Intelligence
            </span>
          </div>

          {/* Pan-India Police Patrol Fleet Drawer */}
          <div className="mt-3.5 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <PoliceCarBadge size="md" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  State Police Rapid Interception Fleet ({computedPatrolUnits.length} Active Units)
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold border border-rose-200">
                  {selectedStateFilter === 'ALL' ? 'Pan-India Active' : selectedStateFilter}
                </span>
              </div>
              <button
                onClick={() => setPatrolDrawerOpen(!patrolDrawerOpen)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <span>{patrolDrawerOpen ? 'Collapse Fleet' : 'Expand Fleet Grid'}</span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${patrolDrawerOpen ? 'rotate-90' : ''}`} />
              </button>
            </div>

            {patrolDrawerOpen && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {computedPatrolUnits.map((unit) => {
                  const isUnitDispatched = dispatchedUnitId === unit.id;
                  const isUnitRouteActive = activePatrolForRoute?.id === unit.id;

                  return (
                    <div
                      key={unit.id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between ${
                        unit.isRecommended
                          ? 'bg-gradient-to-b from-rose-50/80 to-white border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                          : isUnitRouteActive
                          ? 'bg-blue-50/50 border-blue-300'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900">{unit.unitCode}</span>
                              <span className="text-[10px] font-mono text-slate-500 font-bold">({unit.callsign})</span>
                            </div>
                            <div className="text-[11px] font-semibold text-slate-700 truncate max-w-[130px]">
                              {unit.name}
                            </div>
                          </div>
                          {unit.isRecommended ? (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow-2xs">
                              ★ AI PICK
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-bold">
                              {unit.tacticalClass}
                            </span>
                          )}
                        </div>

                        <div className="space-y-1 text-[10px] text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100 mb-2">
                          <div className="flex justify-between">
                            <span>Vehicle:</span>
                            <span className="font-semibold text-slate-800">{unit.vehicleType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>State / City:</span>
                            <span className="font-semibold text-slate-800">{unit.city} ({unit.state})</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Speed & VHF:</span>
                            <span className="font-mono text-indigo-700 font-bold">{unit.speedKmH}km/h • {unit.radioChannel.split(' ')[0]}</span>
                          </div>
                          {unit.distanceKm !== undefined && (
                            <div className="flex justify-between text-rose-700 font-black pt-1 border-t border-slate-200">
                              <span>To Target ATM:</span>
                              <span>{unit.distanceKm} km (~{unit.etaMinutes} min • {unit.compassDirection || 'SW'})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => setSelectedPatrolForRouteId(unit.id)}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                            isUnitRouteActive
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-50'
                          }`}
                        >
                          {isUnitRouteActive ? 'Route Active' : 'Plot Route'}
                        </button>
                        <button
                          onClick={() => handleDispatchNearestPatrol(unit)}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-colors flex items-center justify-center gap-1 ${
                            isUnitDispatched
                              ? 'bg-emerald-600 text-white animate-pulse'
                              : 'bg-[#E11D48] text-white hover:bg-rose-700'
                          }`}
                        >
                          <Siren className="w-3 h-3" />
                          <span>{isUnitDispatched ? 'Dispatched' : 'Alert'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right (4 cols): ATM Terminal Forensic Dossier */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-surface-border p-6 shadow-soft space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-surface-border">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                ATM Terminal Dossier
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Terminal identity & road direction parameters.
              </p>
            </div>

            {selectedAtmPrediction ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-700 border border-rose-200">
                ★ Target Match
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Monitored Node
              </span>
            )}
          </div>

          {selectedAtm ? (
            <div className="space-y-3.5">
              {/* 1. Terminal Name & Brand */}
              <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-lavender-iconBg text-brand-700 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                    Terminal Identification
                  </span>
                  <div className="text-sm font-extrabold text-slate-900 truncate mt-0.5">
                    {selectedAtm.name}
                  </div>
                  <div className="text-xs font-semibold text-slate-600 truncate">
                    Terminal ID: ATM-TN-{String(selectedAtm.id).padStart(3, '0')}
                  </div>
                </div>
              </div>

              {/* 2. Google Maps Road Direction Corridor Card */}
              <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#1A73E8] uppercase tracking-wider flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-[#1A73E8]" />
                    <span>Google Maps Road Navigation</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#1A73E8] text-white text-[10px] font-black">
                    {roadRoute?.isRealRoad ? 'FASTEST ROUTE' : 'ACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white/90 border border-blue-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Road Distance</span>
                    <span className="text-sm font-black text-[#1A73E8] mt-0.5 block">
                      {roadRoute ? `${roadRoute.distanceKm} km` : 'Calculating...'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/90 border border-blue-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Driving Transit</span>
                    <span className="text-sm font-black text-slate-800 mt-0.5 block">
                      {roadRoute ? `~${roadRoute.durationMinutes} mins` : 'Calculating...'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-blue-800 font-medium flex items-center justify-between pt-1">
                  <span className="truncate">From: {userLocationName}</span>
                  <button
                    onClick={handleFitRouteBounds}
                    className="text-xs font-extrabold text-[#1A73E8] hover:text-blue-900 underline flex-shrink-0"
                  >
                    Fit Road Route
                  </button>
                </div>
              </div>

              {/* 3. AI Recommended Field Interceptor & Turn-by-Turn Road Route Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-slate-50 border-2 border-rose-300 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <PoliceCarBadge size="md" />
                    <span className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-1">
                      <span>AI Interceptor Dispatch</span>
                      {activePatrolForRoute?.isRecommended && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black uppercase">
                          ★ AI PICK
                        </span>
                      )}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      activeDispatchedUnit
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    {activeDispatchedUnit ? '🚨 DISPATCHED' : 'READY TO INTERCEPT'}
                  </span>
                </div>

                {activePatrolForRoute && (
                  <div className="p-3.5 rounded-xl bg-white border border-rose-200/80 shadow-2xs space-y-2.5">
                    {/* Unit ID & Tactical Score */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-slate-900">{activePatrolForRoute.unitCode}</span>
                          <span className="text-[11px] font-mono text-slate-600 font-bold">({activePatrolForRoute.callsign})</span>
                        </div>
                        <div className="text-xs font-bold text-slate-700 mt-0.5">
                          {activePatrolForRoute.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {activePatrolForRoute.vehicleType} • <span className="font-semibold text-slate-700">{activePatrolForRoute.city}, {activePatrolForRoute.state}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 text-[10px] font-black block">
                          AI Score: {activePatrolForRoute.aiScore ?? 96}/100
                        </span>
                        <span className="text-xs font-black text-rose-600 mt-1 block">
                          {patrolRoadRoute ? `${patrolRoadRoute.distanceKm} km road` : `${activePatrolForRoute.distanceKm} km direct`}
                        </span>
                        <span className="text-[11px] font-extrabold text-slate-700 block">
                          ~{patrolRoadRoute ? patrolRoadRoute.durationMinutes : activePatrolForRoute.etaMinutes} min ETA
                        </span>
                      </div>
                    </div>

                    {/* AI Recommendation Rationale Banner */}
                    <div className="p-2 rounded-lg bg-rose-50/80 border border-rose-200/70 text-[11px] text-rose-900 font-medium flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                      <span>
                        {activePatrolForRoute.recommendationReason ||
                          `Fastest tactical response unit on ${activePatrolForRoute.compassDirection || 'SW'} approach corridor (~${activePatrolForRoute.etaMinutes} min ETA).`}
                      </span>
                    </div>

                    {/* Corridor Approach & Bearing */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Approach Direction</span>
                        <span className="font-extrabold text-slate-800 flex items-center gap-1 mt-0.5">
                          <Compass className="w-3 h-3 text-indigo-600" />
                          <span>{activePatrolForRoute.compassDirection || 'SW'} Corridor ({Math.round(activePatrolForRoute.bearingDeg || 225)}°)</span>
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Pursuit Cruising</span>
                        <span className="font-extrabold text-slate-800 mt-0.5 block">
                          {activePatrolForRoute.speedKmH} km/h • {activePatrolForRoute.tacticalClass}
                        </span>
                      </div>
                    </div>

                    {/* Officers & VHF Radio */}
                    <div className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-1">
                      <span>Crew: <strong>{activePatrolForRoute.officers.join(', ')}</strong></span>
                      <span className="font-mono text-indigo-700 font-bold">{activePatrolForRoute.radioChannel}</span>
                    </div>
                  </div>
                )}

                {/* 1-Click Alert Interceptor Action Button */}
                {!activeDispatchedUnit ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleDispatchNearestPatrol(activePatrolForRoute || undefined)}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E11D48] to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-black text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/35 active:scale-[0.98]"
                    >
                      <Siren className="w-4 h-4 animate-bounce" />
                      <span>
                        Alert {activePatrolForRoute?.unitCode || 'Interceptor'} (~{patrolRoadRoute ? patrolRoadRoute.durationMinutes : activePatrolForRoute?.etaMinutes || 3} min ETA)
                      </span>
                    </button>

                    <button
                      onClick={() => setShowPatrolRoute(!showPatrolRoute)}
                      className="w-full py-1.5 text-center text-xs font-bold text-[#1A73E8] hover:text-blue-800 flex items-center justify-center gap-1"
                    >
                      <Route className="w-3.5 h-3.5" />
                      <span>{showPatrolRoute ? 'Hide Patrol Road Corridor' : 'Show Turn-by-Turn Patrol Corridor'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-xl bg-rose-600 text-white flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <Siren className="w-4 h-4 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-wider">
                          Interception Countdown
                        </span>
                      </div>
                      <span className="text-sm font-mono font-black">
                        {interceptionSecondsLeft !== null && interceptionSecondsLeft > 0
                          ? `${Math.floor(interceptionSecondsLeft / 60).toString().padStart(2, '0')}:${(interceptionSecondsLeft % 60).toString().padStart(2, '0')}`
                          : arrestConfirmed
                          ? 'APPREHENDED'
                          : '00:00 (AT TERMINAL)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {!arrestConfirmed ? (
                        <button
                          onClick={handleConfirmArrest}
                          className="py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Suspect Apprehended</span>
                        </button>
                      ) : (
                        <div className="py-2 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs text-center border border-emerald-300">
                          ✓ Cash Secured
                        </div>
                      )}

                      <button
                        onClick={handleStandDownPatrol}
                        className="py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition-colors"
                      >
                        Stand Down
                      </button>
                    </div>

                    <button
                      onClick={() => setIsDispatchModalOpen(true)}
                      className="w-full py-1.5 text-center text-xs font-bold text-rose-700 hover:text-rose-900 underline"
                    >
                      View Full Tactical Dispatch Order & Radio Brief
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Calculated Risk & Match Confidence */}
              <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center flex-shrink-0">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block truncate">
                      Surveillance Risk
                    </span>
                    <span className="text-xs font-bold text-slate-800 block truncate mt-0.5">
                      {selectedAtmPrediction ? 'High-Velocity Target' : 'Cluster Threat Score'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 flex items-center whitespace-nowrap">
                  <RiskBadge level={selectedAtm.risk_level} />
                </div>
              </div>

              {/* 5. Physical Address & Location */}
              <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-brand-600 shrink-0" />
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Physical Address & Landmark
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 leading-relaxed pl-6">
                  {selectedAtm.location}
                </div>
                <div className="text-xs font-semibold text-slate-500 pl-6">
                  {selectedAtm.city}, Tamil Nadu
                </div>
              </div>

              {/* 6. GPS Geolocation Coordinates (with 1-click Copy) */}
              <div className="p-4 rounded-2xl bg-surface-bg/80 border border-slate-100 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Navigation className="w-5 h-5 text-indigo-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      GPS Coordinates
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      {selectedAtm.latitude.toFixed(5)}° N, {selectedAtm.longitude.toFixed(5)}° E
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleCopyGps(selectedAtm.latitude, selectedAtm.longitude)}
                  className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors flex items-center gap-1 shadow-2xs"
                  title="Copy GPS coordinates"
                >
                  {copiedGps ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* 7. If Predicted: Estimated Time Window & Rationale */}
              {selectedAtmPrediction && (
                <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Likely Cash-Out Window</span>
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-200 text-rose-800 text-xs font-black">
                      {selectedAtmPrediction.confidence}% Match
                    </span>
                  </div>
                  <div className="text-sm font-black text-rose-900">
                    {selectedAtmPrediction.time_window} hrs
                  </div>
                  <p className="text-[11px] text-rose-800/90 font-medium leading-relaxed pt-1 border-t border-rose-200/60">
                    {selectedAtmPrediction.reason}
                  </p>
                </div>
              )}

              {/* Feedback toast when alert is dispatched */}
              {alertSent && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Surveillance alert dispatched to Local Field Patrol Unit!</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2.5">
                <button
                  onClick={handleFitRouteBounds}
                  className="w-full py-2.5 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#1A73E8] font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs border border-blue-200"
                >
                  <Route className="w-4 h-4 text-[#1A73E8]" />
                  <span>Fit Google Maps Road Route</span>
                </button>

                <button
                  onClick={() => {
                    setMapCenter([selectedAtm.latitude, selectedAtm.longitude]);
                    setMapZoom(16);
                  }}
                  className="w-full py-2.5 rounded-2xl bg-lavender-pill hover:bg-lavender-active text-brand-700 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs"
                >
                  <Crosshair className="w-4 h-4" />
                  <span>Center & Zoom on ATM</span>
                </button>

                <button
                  onClick={() => handleOpenWithdrawalIntel(selectedAtm.id)}
                  disabled={loadingWithdrawal}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shadow-indigo-500/25"
                >
                  <Eye className="w-4 h-4 text-indigo-200" />
                  <span>{loadingWithdrawal ? 'Loading Suspect Dossier...' : 'Who Withdrew Money Here? (CCTV Intel & PDF)'}</span>
                </button>

                <button
                  onClick={handleDispatchAlert}
                  className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm shadow-brand-500/20"
                >
                  <BellRing className="w-4 h-4" />
                  <span>Dispatch Terminal Surveillance Alert</span>
                </button>

                <button
                  onClick={() => navigate(`/money-flow?account_id=${selectedAccountId}`)}
                  className="w-full py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-2xs"
                >
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span>Inspect Account Flow History</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-8 text-center">
              Click any ATM marker or predicted card to view detailed surveillance parameters and road directions.
            </p>
          )}
        </div>
      </div>

      {/* Tactical Interception Dispatch Modal */}
      {isDispatchModalOpen && activeDispatchedUnit && selectedAtm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-xl shadow-inner">
                  🚨
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-200 block">
                    Police Field Tactical Order
                  </span>
                  <h3 className="text-base font-extrabold tracking-tight">
                    Interception Dispatch Confirmed
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Emergency Banner */}
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800 font-extrabold">
                  <Siren className="w-4 h-4 text-rose-600" />
                  <span>Priority Interception: Cash-Out Runner Intercept</span>
                </div>
                <button
                  onClick={playPoliceSirenTone}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] transition-colors flex items-center gap-1 shadow-2xs"
                  title="Sound Siren Warning"
                >
                  <span>🔊 Siren</span>
                </button>
              </div>

              {/* Tactical Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-surface-bg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Unit</span>
                  <span className="text-xs font-extrabold text-slate-900 mt-0.5 block">
                    {activeDispatchedUnit.unitCode} ({activeDispatchedUnit.callsign})
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block">
                    {activeDispatchedUnit.vehicleType}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-bg border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Response ETA</span>
                  <span className="text-xs font-extrabold text-rose-600 mt-0.5 block">
                    ~{activeDispatchedUnit.etaMinutes} mins ({activeDispatchedUnit.distanceKm} km)
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block">
                    Cruising at {activeDispatchedUnit.speedKmH} km/h
                  </span>
                </div>
              </div>

              {/* Target ATM Location */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Target ATM Node</span>
                <div className="text-xs font-black text-slate-900">{selectedAtm.name}</div>
                <div className="text-[11px] text-slate-600">{selectedAtm.location}, {selectedAtm.city}</div>
                <div className="text-[10px] font-mono text-slate-500">
                  GPS: {selectedAtm.latitude.toFixed(5)}° N, {selectedAtm.longitude.toFixed(5)}° E
                </div>
              </div>

              {/* Radio & Officers */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Radio VHF Channel</span>
                  <span className="font-mono font-black text-xs text-indigo-900">
                    {activeDispatchedUnit.radioChannel}
                  </span>
                </div>
                <div className="text-[11px] text-indigo-950 font-medium">
                  Field Officers: <strong>{activeDispatchedUnit.officers.join(' & ')}</strong>
                </div>
              </div>

              {/* Statutory Framework */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <strong>Statutory Authority:</strong> Executing on-site runner apprehension under Section 107 of Bharatiya Nagarik Suraksha Sanhita, 2023 (BNSS) & Section 66D of Information Technology Act, 2000.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                onClick={handleStandDownPatrol}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs transition-colors"
              >
                Stand Down Patrol
              </button>

              <button
                onClick={() => setIsDispatchModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-colors shadow-sm"
              >
                Acknowledge & Monitor Radar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forensic Who Withdrew Money Suspect Dossier & PDF Modal */}
      <WithdrawalIntelModal
        intel={selectedWithdrawalIntel}
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
      />
    </div>
  );
};

