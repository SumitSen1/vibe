import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, useMap, MapMarker, MarkerContent, MarkerPopup } from './ui/map';

// ---------------------------------------------------------------------------
// FlyToHandler — sets map view when flyToPosition changes (uses useMap hook)
// ---------------------------------------------------------------------------
function FlyToHandler({ flyToPosition }) {
  const { map, isLoaded } = useMap();
  const lastTsRef = useRef(null);

  useEffect(() => {
    if (!flyToPosition) return;
    // Avoid re-firing for the same flyToPosition object
    if (flyToPosition._ts && flyToPosition._ts === lastTsRef.current) return;
    lastTsRef.current = flyToPosition._ts || null;

    if (!map || !isLoaded) return;

    try {
      map.flyTo({
        center: [flyToPosition.lng, flyToPosition.lat],
        zoom: 16,
        duration: 800,
      });
    } catch (err) {
      console.warn('FlyToHandler: flyTo failed, trying easeTo', err);
      try {
        map.easeTo({
          center: [flyToPosition.lng, flyToPosition.lat],
          zoom: 16,
          duration: 600,
        });
      } catch (err2) {
        console.error('FlyToHandler: easeTo also failed', err2);
      }
    }
  }, [map, isLoaded, flyToPosition]);

  return null;
}

// ---------------------------------------------------------------------------
// InitialCenter — centers map on user position once the map loads
// ---------------------------------------------------------------------------
function InitialCenter({ position }) {
  const { map, isLoaded } = useMap();
  const hasCenteredRef = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded || !position || hasCenteredRef.current) return;
    hasCenteredRef.current = true;

    map.easeTo({
      center: [position.lng, position.lat],
      zoom: 14,
      duration: 400,
    });
  }, [map, isLoaded, position]);

  return null;
}


// ---------------------------------------------------------------------------
// ZoneCircles — renders red zone circles via MapLibre GeoJSON layers
// ---------------------------------------------------------------------------
function ZoneCircles({ zones }) {
  const { map, isLoaded } = useMap();
  const sourceAddedRef = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const sourceId = 'zone-circles-widget';
    const innerLayerId = 'zone-inner-widget';
    const outerLayerId = 'zone-outer-widget';

    const geojson = {
      type: 'FeatureCollection',
      features: zones.flatMap((zone) => [
        {
          type: 'Feature',
          properties: { type: 'inner' },
          geometry: {
            type: 'Point',
            coordinates: [zone.location.lng, zone.location.lat],
          },
        },
      ]),
    };

    if (!sourceAddedRef.current) {
      try {
        map.addSource(sourceId, { type: 'geojson', data: geojson });

        // Inner solid fill (darker red core)
        map.addLayer({
          id: innerLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 18,
            'circle-color': '#ef4444',
            'circle-opacity': 0.5,
          },
        });

        // Outer ring (lighter danger halo)
        map.addLayer({
          id: outerLayerId,
          type: 'circle',
          source: sourceId,
          paint: {
            'circle-radius': 45,
            'circle-color': '#f87171',
            'circle-opacity': 0.2,
          },
        });

        sourceAddedRef.current = true;
      } catch {}
    } else {
      // Update data if already mounted
      const src = map.getSource(sourceId);
      if (src) src.setData(geojson);
    }

    return () => {
      try {
        if (map.getLayer(outerLayerId)) map.removeLayer(outerLayerId);
        if (map.getLayer(innerLayerId)) map.removeLayer(innerLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
        sourceAddedRef.current = false;
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded, zones]);

  return null;
}

// ---------------------------------------------------------------------------
// MapWidget — Small map card for the dashboard.
// Shows user location marker and zone circles. Click → navigate to full map.
// ---------------------------------------------------------------------------
const MapWidget = ({ position, zones = [], flyToPosition }) => {
  const navigate = useNavigate();
  const darkMode = document.documentElement.classList.contains('dark');

  const center = position
    ? [position.lng, position.lat]
    : [77.209, 28.6139]; // Default: New Delhi [lng, lat] for MapLibre

  return (
    <div className="stat-card p-0 overflow-hidden relative group" style={{ height: '280px' }}>
      {/* Label overlay */}
      <div className="absolute top-3 left-3 z-[10] flex items-center gap-2">
        <span className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-gov-800 dark:text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm border border-white/50 dark:border-slate-700/50">
          📍 Live Map
        </span>
      </div>

      {/* Click-to-expand overlay */}
      <div
        onClick={() => navigate('/dashboard/map')}
        className="absolute inset-0 z-[5] bg-gov-900/0 group-hover:bg-gov-900/10 transition-colors duration-300 flex items-end justify-center cursor-pointer"
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm text-gov-800 dark:text-slate-200 text-sm font-bold px-4 py-2 rounded-xl shadow-lg mb-4">
          Click to expand →
        </div>
      </div>

      {/* MapCN Map — disables all interaction for widget use */}
      <Map
        center={center}
        zoom={13}
        theme={darkMode ? 'dark' : 'light'}
        dragPan={false}
        scrollZoom={false}
        doubleClickZoom={false}
        touchZoomRotate={false}
        keyboard={false}
      >
        <FlyToHandler flyToPosition={flyToPosition} />
        <InitialCenter position={position} />
        <ZoneCircles zones={zones} />

        {/* User location marker */}
        {position && (
          <MapMarker longitude={position.lng} latitude={position.lat}>
            <MarkerContent>
              {/* Custom green dot with accuracy ring */}
              <div className="relative flex items-center justify-center">
                <span className="absolute h-8 w-8 rounded-full bg-green-400/30 animate-ping" />
                <span className="h-4 w-4 rounded-full bg-green-500 border-2 border-white shadow-lg block" />
              </div>
            </MarkerContent>
            <MarkerPopup>
              <div className="text-center p-1">
                <p className="font-bold text-sm text-green-700">📍 You are here</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
                </p>
              </div>
            </MarkerPopup>
          </MapMarker>
        )}
      </Map>
    </div>
  );
};

export default MapWidget;
