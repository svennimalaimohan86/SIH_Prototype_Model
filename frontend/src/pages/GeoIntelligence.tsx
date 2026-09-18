import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
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
  Car
} from 'lucide-react';
import { api } from '../services/api';
import { ATMLocation, CashoutPrediction, AccountRiskScore } from '../types';
import { RiskBadge } from '../components/RiskBadge';

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

interface RoadRoute {
  coordinates: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  isRealRoad: boolean;
}

export const GeoIntelligence: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialAccountId = searchParams.get('account_id') || '127';
  const [selectedAccountId, setSelectedAccountId] = useState<string>(initialAccountId);

  const [atms, setAtms] = useState<ATMLocation[]>([]);
  const [predictions, setPredictions] = useState<CashoutPrediction[]>([]);
  const [accounts, setAccounts] = useState<AccountRiskScore[]>([]);
  const [selectedAtm, setSelectedAtm] = useState<ATMLocation | null>(null);

  // User location & Direction route states
  const [userLocation, setUserLocation] = useState<[number, number]>([11.3780, 77.8920]); // Command Center HQ in Tiruchengode
  const [userLocationName, setUserLocationName] = useState<string>('Investigator Command HQ (Tiruchengode)');
  const [showDirectionRoute, setShowDirectionRoute] = useState<boolean>(true);
  const [locatingUser, setLocatingUser] = useState<boolean>(false);
  const [fitRouteBounds, setFitRouteBounds] = useState<[[number, number], [number, number]] | null>(null);

  // Real turn-by-turn road route like Google Maps
  const [roadRoute, setRoadRoute] = useState<RoadRoute | null>(null);
  const [routingLoading, setRoutingLoading] = useState<boolean>(false);

  // Full Screen map state
  const [isMapFullscreen, setIsMapFullscreen] = useState<boolean>(false);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'PREDICTED' | 'HIGH_RISK'>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');

  // UI feedback states
  const [copiedGps, setCopiedGps] = useState<boolean>(false);
  const [alertSent, setAlertSent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

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
                className={`bg-white rounded-3xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                  isCardSelected
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
                  <span className="text-blue-700 font-bold">My Location</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-1.5 bg-[#1A73E8] rounded-full shadow-xs"></span>
                  <span className="text-[#1A73E8] font-bold">Road Route (Google Maps)</span>
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
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600">Standard</span>
                </div>
              </div>
            </div>

            {/* Search, Route & Full Screen Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              {/* Search input */}
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search 30 ATMs by name or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-bg border border-slate-200 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              {/* Action Buttons & Filters */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Direction Route Toggle */}
                <button
                  onClick={() => setShowDirectionRoute(!showDirectionRoute)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 shadow-2xs ${
                    showDirectionRoute
                      ? 'bg-[#1A73E8] text-white border-[#1A73E8] shadow-blue-500/25'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Toggle real road directions like Google Maps"
                >
                  <Route className="w-3.5 h-3.5" />
                  <span>{showDirectionRoute ? 'Road Route: ON' : 'Road Route: OFF'}</span>
                </button>

                {/* My Location / Locate Me Button */}
                <button
                  onClick={handleGetDeviceLocation}
                  className="px-2.5 py-1.5 rounded-xl bg-surface-bg hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs"
                  title="Center on My Location"
                >
                  <Locate className={`w-3.5 h-3.5 text-blue-600 ${locatingUser ? 'animate-spin' : ''}`} />
                  <span>My Location</span>
                </button>

                {/* Risk Filters */}
                <button
                  onClick={() => setRiskFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    riskFilter === 'ALL'
                      ? 'bg-slate-800 text-white'
                      : 'bg-surface-bg text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All (30)
                </button>
                <button
                  onClick={() => setRiskFilter('PREDICTED')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    riskFilter === 'PREDICTED'
                      ? 'bg-rose-600 text-white'
                      : 'bg-surface-bg text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Targets (3)
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
                  <span>{isMapFullscreen ? 'Exit Full Screen' : 'Full Screen'}</span>
                </button>
              </div>
            </div>

            {/* City Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">City:</span>
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

              {/* OpenStreetMap Standard Tile Layer */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* 1. "My Location" Origin Marker */}
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

              {/* 2. Real Google Maps Road-Following Blue Line (OSRM turn-by-turn geometry) */}
              {showDirectionRoute && selectedAtm && roadRoute && roadRoute.coordinates.length >= 2 && (
                <>
                  {/* Glowing outer aura to make the blue line pop and never collapse */}
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

                  {/* Primary Solid Vibrant Blue Road Direction Line (Google Maps style) */}
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

                  {/* Floating Google Maps style distance/time pill at the road route midpoint */}
                  <Marker
                    position={
                      roadRoute.coordinates[Math.floor(roadRoute.coordinates.length / 2)]
                    }
                    icon={L.divIcon({
                      html: `
                        <div style="transform: translate(-50%, -50%);" class="bg-[#1A73E8] text-white font-extrabold text-[11px] px-3 py-1 rounded-full shadow-xl border-2 border-white whitespace-nowrap flex items-center gap-1.5 cursor-default select-none">
                          <span>🚗</span>
                          <span>${roadRoute.durationMinutes} min (${roadRoute.distanceKm} km)</span>
                        </div>
                      `,
                      className: 'route-midpoint-badge',
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

              {/* 3. ATM Markers */}
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

                        <button
                          onClick={() => handleSelectAtm(atm)}
                          className="w-full py-1.5 rounded-lg bg-[#1A73E8] text-white text-[11px] font-bold hover:bg-blue-700 transition-colors"
                        >
                          Plot Google Maps Road Directions
                        </button>
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
              <span>Solid blue line traces exact street roadway directions like Google Maps.</span>
              {isMapFullscreen && (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
                  Press ESC or click button to exit full screen
                </span>
              )}
            </div>
            <span>Copyright © OpenStreetMap contributors 2026 • Nexora Geo Intelligence</span>
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

              {/* 3. Calculated Risk & Match Confidence */}
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

              {/* 4. Physical Address & Location */}
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

              {/* 5. GPS Geolocation Coordinates (with 1-click Copy) */}
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

              {/* 6. If Predicted: Estimated Time Window & Rationale */}
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
    </div>
  );
};
