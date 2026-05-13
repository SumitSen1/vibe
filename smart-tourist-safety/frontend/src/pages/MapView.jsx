import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { Map, useMap, MapMarker, MarkerContent, MarkerPopup } from '../components/ui/map';
import CommentModal from '../components/CommentModal';
import ProximityAlert from '../components/ProximityAlert';
import { fetchZones as fetchZonesUtil, createZone, updateZone, deleteZone } from '../utils/zoneStorage';

// ---------------------------------------------------------------------------
// Map style definitions — compatible with MapLibre / mapcn styles prop
// ---------------------------------------------------------------------------
const MAP_STYLES = {
  default: undefined, // → Carto Voyager (light) / Dark Matter (dark) auto
  openstreetmap: {
    light: 'https://tiles.openfreemap.org/styles/bright',
    dark: 'https://tiles.openfreemap.org/styles/bright',
  },
  openstreetmap3d: {
    light: 'https://tiles.openfreemap.org/styles/liberty',
    dark: 'https://tiles.openfreemap.org/styles/liberty',
  },
};

const STYLE_LABELS = {
  default: 'Default (Carto)',
  openstreetmap: 'OpenStreetMap',
  openstreetmap3d: 'OpenStreetMap 3D',
};

// ---------------------------------------------------------------------------
// Haversine formula — distance in meters between two lat/lng points
// ---------------------------------------------------------------------------
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// LocationWatcher — watches geolocation inside the Map context
// ---------------------------------------------------------------------------
function LocationWatcher({ setPosition }) {
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('Location error:', err.message),
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [setPosition]);

  return null;
}

// ---------------------------------------------------------------------------
// MapClickHandler — listens for map clicks while in zone-adding mode
// ---------------------------------------------------------------------------
function MapClickHandler({ isAddingMode, onLocationSelected }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const handleClick = (e) => {
      if (isAddingMode) {
        onLocationSelected({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      }
    };

    map.on('click', handleClick);
    return () => map.off('click', handleClick);
  }, [map, isLoaded, isAddingMode, onLocationSelected]);

  return null;
}

// ---------------------------------------------------------------------------
// ZoneCircles — renders danger zones as GeoJSON circle layers
// ---------------------------------------------------------------------------
function ZoneCircles({ zones, onEditZone, onDeleteZone }) {
  const { map, isLoaded } = useMap();
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceId = 'danger-zones';
    const innerLayerId = 'danger-zones-inner';
    const outerLayerId = 'danger-zones-outer';
    const borderLayerId = 'danger-zones-border';

    const geojson = {
      type: 'FeatureCollection',
      features: zones.map((zone) => ({
        type: 'Feature',
        properties: {
          id: zone._id,
          comment: zone.comment || zone.description || '',
          lat: zone.location.lat,
          lng: zone.location.lng,
          createdAt: zone.createdAt,
          radius: zone.radius || 250,
        },
        geometry: {
          type: 'Point',
          coordinates: [zone.location.lng, zone.location.lat],
        },
      })),
    };

    if (!mountedRef.current) {
      try {
        map.addSource(sourceId, { type: 'geojson', data: geojson });

        map.addLayer({
          id: outerLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 30, 16, 90],
            'circle-color': '#fca5a5',
            'circle-opacity': 0.2,
          },
        });

        map.addLayer({
          id: borderLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 25, 16, 75],
            'circle-color': 'transparent',
            'circle-stroke-color': '#f87171',
            'circle-stroke-width': 2,
            'circle-opacity': 0,
          },
        });

        map.addLayer({
          id: innerLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 16, 35],
            'circle-color': '#991b1b',
            'circle-opacity': 0.55,
          },
        });

        mountedRef.current = true;
      } catch (e) {
        console.error('ZoneCircles init error:', e);
      }
    } else {
      const src = map.getSource(sourceId);
      if (src) src.setData(geojson);
    }

    return () => {
      try {
        if (map.getLayer(innerLayerId)) map.removeLayer(innerLayerId);
        if (map.getLayer(borderLayerId)) map.removeLayer(borderLayerId);
        if (map.getLayer(outerLayerId)) map.removeLayer(outerLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        mountedRef.current = false;
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, zones]);

  return null;
}

// ---------------------------------------------------------------------------
// PitchController — animates pitch when style changes
// ---------------------------------------------------------------------------
function PitchController({ mapStyle }) {
  const { map, isLoaded } = useMap();
  const is3D = mapStyle === 'openstreetmap3d';

  useEffect(() => {
    if (!map || !isLoaded) return;
    // Wait for style to load before easing pitch
    const handleStyleLoad = () => {
      map.easeTo({ pitch: is3D ? 60 : 0, duration: 600 });
    };
    map.once('styledata', handleStyleLoad);
    map.easeTo({ pitch: is3D ? 60 : 0, duration: 600 });
    return () => map.off('styledata', handleStyleLoad);
  }, [map, isLoaded, is3D]);

  return null;
}

// ---------------------------------------------------------------------------
// MapView — Full-screen interactive map with MapCN
// ---------------------------------------------------------------------------
const MapView = () => {
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [position, setPosition] = useState(null);
  const [zones, setZones] = useState([]);
  const [isAddingZone, setIsAddingZone] = useState(false);
  const [draftLatlng, setDraftLatlng] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [isSosLoading, setIsSosLoading] = useState(false);
  const [proximityZone, setProximityZone] = useState(null);
  const alertedZonesRef = useRef(new Set());
  const [isLocating, setIsLocating] = useState(false);

  // Style switcher state
  const [mapStyle, setMapStyle] = useState('default');

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  // Inline editing state for zone popups
  const [editingZoneId, setEditingZoneId] = useState(null);
  const [editText, setEditText] = useState('');

  // Sync dark mode class + localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Fetch zones
  const fetchZones = useCallback(async () => {
    const data = await fetchZonesUtil();
    setZones(data);
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  // Proximity check
  useEffect(() => {
    if (!position || !zones.length) return;
    for (const zone of zones) {
      const dist = getDistanceMeters(
        position.lat, position.lng,
        zone.location.lat, zone.location.lng
      );
      if (dist <= (zone.radius || 250) && !alertedZonesRef.current.has(zone._id)) {
        alertedZonesRef.current.add(zone._id);
        setProximityZone(zone);
        break;
      }
    }
  }, [position, zones]);

  const handleMapClick = (latlng) => {
    setDraftLatlng(latlng);
    setShowCommentModal(true);
  };

  const handleSubmitZone = async (comment) => {
    if (!draftLatlng) return;
    await createZone({ lat: draftLatlng.lat, lng: draftLatlng.lng, description: comment, comment, radius: 250 });
    await fetchZones();
    setShowCommentModal(false);
    setDraftLatlng(null);
    setIsAddingZone(false);
  };

  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Delete this danger zone?')) return;
    await deleteZone(zoneId);
    await fetchZones();
  };

  const handleSaveEdit = async (zoneId) => {
    if (!editText.trim()) return;
    await updateZone(zoneId, { comment: editText.trim(), description: editText.trim() });
    await fetchZones();
    setEditingZoneId(null);
    setEditText('');
  };

  // SOS
  const handleSOS = async () => {
    if (!position) { alert('Still acquiring your location.'); return; }
    if (!window.confirm('EMERGENCY: Do you want to dispatch an SOS to authorities?')) return;
    setIsSosLoading(true);
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lat: position.lat, lng: position.lng }),
      });
      const data = await res.json();
      alert(data.success ? 'SOS Dispatch Successful! Authorities have been notified.' : 'Failed: ' + (data.message || 'Unknown error'));
    } catch { alert('Critical network error when sending SOS.'); }
    finally { setIsSosLoading(false); }
  };

  // Where Am I?
  const handleWhereAmI = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation not supported.');
      return;
    }

    const flyToCurrentPosition = (pos) => {
      if (mapRef.current) {
        mapRef.current.flyTo({ center: [pos.lng, pos.lat], zoom: 17, duration: 1200 });
      } else {
        console.warn('Map ref not available for flyTo');
      }
    };

    if (position) {
      flyToCurrentPosition(position);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        flyToCurrentPosition(newPos);
        setIsLocating(false);
      },
      (err) => { alert('Unable to retrieve location: ' + err.message); setIsLocating(false); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const selectedStyles = MAP_STYLES[mapStyle];

  return (
    <div className="h-screen w-screen relative">
      {/* Full-screen MapCN Map */}
      <Map
        ref={mapRef}
        center={[77.209, 28.6139]}
        zoom={13}
        styles={selectedStyles}
        theme={darkMode ? 'dark' : 'light'}
      >
        {/* Geolocation watcher */}
        <LocationWatcher setPosition={setPosition} />

        {/* Map click handler (zone-adding mode) */}
        <MapClickHandler isAddingMode={isAddingZone} onLocationSelected={handleMapClick} />

        {/* Pitch controller (3D mode) */}
        <PitchController mapStyle={mapStyle} />

        {/* Danger zone circles */}
        <ZoneCircles zones={zones} />

        {/* User location marker */}
        {position && (
          <MapMarker longitude={position.lng} latitude={position.lat}>
            <MarkerContent>
              <div className="relative flex items-center justify-center">
                <span className="absolute h-10 w-10 rounded-full bg-green-400/30 animate-ping" />
                <span className="h-5 w-5 rounded-full bg-green-500 border-2 border-white shadow-lg block" />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="text-center p-1">
                <p className="font-bold text-gov-700 text-sm">📍 You are here</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                </p>
              </div>
            </MarkerPopup>
          </MapMarker>
        )}

        {/* Zone markers with edit/delete popups */}
        {zones.map((zone) => (
          <MapMarker key={zone._id} longitude={zone.location.lng} latitude={zone.location.lat}>
            <MarkerContent>
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-red-500 to-red-700 border-2 border-white shadow-md text-white text-xs font-bold">
                ⚠
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                    <span className="text-white text-[10px]">⚠️</span>
                  </div>
                  <h4 className="font-bold text-red-700 text-sm">Danger Zone</h4>
                </div>
                {editingZoneId === zone._id ? (
                  <div className="space-y-2">
                    <textarea
                      className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none resize-none"
                      rows="2"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <button onClick={() => handleSaveEdit(zone._id)} className="px-2.5 py-1 text-xs font-medium bg-gov-600 text-white rounded hover:bg-gov-700">Save</button>
                      <button onClick={() => { setEditingZoneId(null); setEditText(''); }} className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-slate-700 mb-1">{zone.comment || zone.description}</p>
                    <p className="text-[10px] text-slate-400 mb-3">
                      Reported {new Date(zone.createdAt).toLocaleDateString()} • {zone.location.lat.toFixed(4)}, {zone.location.lng.toFixed(4)}
                    </p>
                    <div className="flex gap-1.5">
                      <button onClick={() => { setEditingZoneId(zone._id); setEditText(zone.comment || zone.description || ''); }} className="px-2.5 py-1 text-xs font-medium text-gov-600 bg-gov-50 rounded hover:bg-gov-100 flex items-center gap-1">
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDeleteZone(zone._id)} className="px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 flex items-center gap-1">
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </MarkerPopup>
          </MapMarker>
        ))}

        {/* Draft marker (while placing a new zone) */}
        {draftLatlng && (
          <MapMarker longitude={draftLatlng.lng} latitude={draftLatlng.lat}>
            <MarkerContent>
              <div className="h-5 w-5 rounded-full bg-yellow-400 border-2 border-white shadow-md animate-bounce" />
            </MarkerContent>
          </MapMarker>
        )}
      </Map>

      {/* ── Top-left: Back + Where Am I ────────────────────────── */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2">
        <button
          onClick={() => navigate('/dashboard')}
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl shadow-lg font-semibold text-sm hover:bg-white dark:hover:bg-slate-700 transition-all flex items-center gap-2 border border-white/50 dark:border-slate-700/50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Dashboard
        </button>

        <button
          id="where-am-i-map-btn"
          onClick={handleWhereAmI}
          disabled={isLocating}
          className="group bg-gradient-to-r from-gov-500 to-gov-600 hover:from-gov-600 hover:to-gov-700 text-white px-4 py-2.5 rounded-xl shadow-lg font-bold text-sm transition-all flex items-center gap-2 hover:shadow-xl transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-wait"
        >
          {isLocating ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Locating...
            </>
          ) : (
            <>
              <svg className="h-4 w-4 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Where Am I?
            </>
          )}
        </button>
      </div>

      {/* ── Top-right: Style Switcher + Dark Mode + Zone Count ─── */}
      <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
        {/* Map Style Switcher */}
        <div className="relative">
          <select
            value={mapStyle}
            onChange={(e) => setMapStyle(e.target.value)}
            className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-700 dark:text-slate-200 text-sm font-medium px-3 py-2 rounded-xl shadow-lg border border-white/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-all cursor-pointer appearance-none pr-8 focus:outline-none"
          >
            {Object.entries(STYLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <svg className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-2.5 rounded-xl shadow-lg border border-white/50 dark:border-slate-700/50 hover:bg-white dark:hover:bg-slate-700 transition-all"
          title={darkMode ? 'Light Mode' : 'Dark Mode'}
        >
          {darkMode ? (
            <svg className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Zone count */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold border border-white/50 dark:border-slate-700/50 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-slate-700 dark:text-slate-200">{zones.length} Zone{zones.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* ── Bottom-right: Add Zone + SOS ──────────────────────── */}
      <div className="absolute bottom-8 right-6 z-[1000] flex flex-col gap-4 items-end">
        <button
          onClick={() => setIsAddingZone(!isAddingZone)}
          className={`px-5 py-3 rounded-2xl shadow-lg font-bold text-sm flex items-center gap-2 transition-all ${
            isAddingZone
              ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-700'
              : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 border border-slate-200 dark:border-slate-700'
          }`}
        >
          {isAddingZone ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Placement
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Add Danger Zone
            </>
          )}
        </button>

        {isAddingZone && (
          <div className="bg-red-600 text-white px-4 py-2 rounded-xl shadow-lg text-xs font-medium animate-fade-in-up">
            👆 Tap anywhere on the map to place a zone
          </div>
        )}

        {/* SOS Button */}
        <button
          onClick={handleSOS}
          disabled={isSosLoading || !position}
          className="group relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.6)] hover:shadow-[0_0_30px_rgba(239,68,68,0.8)] border-4 border-white dark:border-slate-800 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-70"
        >
          <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping opacity-75" />
          <div className="text-center">
            <svg className="w-8 h-8 mx-auto text-white mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="block text-white font-black text-sm tracking-wider uppercase drop-shadow-md">
              {isSosLoading ? '...' : 'SOS'}
            </span>
          </div>
        </button>
      </div>

      {/* Comment Modal */}
      {showCommentModal && draftLatlng && (
        <CommentModal
          latlng={draftLatlng}
          onSubmit={handleSubmitZone}
          onCancel={() => { setShowCommentModal(false); setDraftLatlng(null); }}
        />
      )}

      {/* Proximity Alert Toast */}
      {proximityZone && (
        <ProximityAlert zone={proximityZone} onDismiss={() => setProximityZone(null)} />
      )}
    </div>
  );
};

export default MapView;
