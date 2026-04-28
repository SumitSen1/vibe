import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import MapWidget from '../components/MapWidget';
import ZoneList from '../components/ZoneList';
import ProximityAlert from '../components/ProximityAlert';
import { fetchZones as fetchZonesUtil, deleteZone, updateZone } from '../utils/zoneStorage';

/**
 * Haversine formula — distance in meters between two lat/lng points.
 */
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Dashboard — Main layout shell with navbar, sidebar, stat cards,
 * map widget, and zone management panel. Supports dark mode.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [zones, setZones] = useState([]);
  const [position, setPosition] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [proximityZone, setProximityZone] = useState(null);
  const [flyToPosition, setFlyToPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const alertedZonesRef = useRef(new Set());
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Auth check + user info
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setUser({ id: payload.id, username: payload.username || 'Tourist' });
    } catch {
      setUser({ username: 'Tourist' });
    }
  }, [navigate]);

  // Get user's live location
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => console.warn('Geolocation error:', err.message),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // Fetch zones (API-first, localStorage fallback)
  const fetchZones = useCallback(async () => {
    const data = await fetchZonesUtil();
    setZones(data);
  }, []);

  useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  // Proximity detection — check if user is within a danger zone
  useEffect(() => {
    if (!position || zones.length === 0) return;

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

  // Delete zone
  const handleDeleteZone = async (zoneId) => {
    if (!window.confirm('Delete this danger zone?')) return;
    await deleteZone(zoneId);
    await fetchZones();
  };

  // Edit zone comment
  const handleEditComment = async (zoneId, newComment) => {
    await updateZone(zoneId, { comment: newComment, description: newComment });
    await fetchZones();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  // "Where Am I?" — re-fetch high-accuracy position and fly the map to it
  const handleWhereAmI = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(newPos);
        // Trigger flyTo with a new object reference to re-animate
        setFlyToPosition({ ...newPos, _ts: Date.now() });
        setIsLocating(false);
      },
      (err) => {
        alert('Unable to retrieve your location: ' + err.message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      {/* Navbar */}
      <Navbar
        user={user}
        zoneCount={zones.length}
        onLogout={handleLogout}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(!darkMode)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          zoneCount={zones.length}
        />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Welcome header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              Welcome back, {user?.username || 'Tourist'} 👋
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Here's your safety monitoring overview
            </p>
          </div>

          {/* Stat cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Location status */}
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-safety-400 to-safety-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-lg">📍</span>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Your Location</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {position
                      ? `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`
                      : 'Acquiring...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Active zones count */}
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-danger-400 to-danger-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-lg">🔴</span>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Danger Zones</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{zones.length} active</p>
                </div>
              </div>
            </div>

            {/* System status */}
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-gov-400 to-gov-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-lg">🛡️</span>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">System Status</p>
                  <p className="text-sm font-bold text-safety-600 dark:text-safety-400 flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-safety-400 animate-pulse-soft inline-block"></span>
                    Active
                  </p>
                </div>
              </div>
            </div>

            {/* Proximity status */}
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-lg">⚠️</span>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">Proximity</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {position && zones.length > 0 ? 'Monitoring' : 'Standby'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Map widget + Zone list grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="zones">
            {/* Map widget card */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <svg className="h-4 w-4 text-gov-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Live Map
                </h3>
                <button
                  id="where-am-i-btn"
                  onClick={handleWhereAmI}
                  disabled={isLocating}
                  className="group flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gov-500 to-gov-600 hover:from-gov-600 hover:to-gov-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-wait"
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
              <MapWidget position={position} zones={zones} flyToPosition={flyToPosition} />
            </div>

            {/* Zone management panel */}
            <div>
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Zone Management
              </h3>
              <ZoneList
                zones={zones}
                onDelete={handleDeleteZone}
                onEditComment={handleEditComment}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Proximity Alert */}
      {proximityZone && (
        <ProximityAlert
          zone={proximityZone}
          onDismiss={() => setProximityZone(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
