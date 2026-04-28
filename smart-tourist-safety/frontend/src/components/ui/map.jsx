/**
 * map.jsx — MapCN base component (adapted from mapcn.dev for plain JSX / Vite+React)
 * Built on MapLibre GL. Supports refs, useMap hook, theme-aware styles, markers & popups.
 */

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import MapLibreGL from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// ---------------------------------------------------------------------------
// Default Carto tile styles (free, no API key needed)
// ---------------------------------------------------------------------------
const DEFAULT_STYLES = {
  light:
    'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  dark:
    'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const MapContext = createContext(null);

export function useMap() {
  return useContext(MapContext);
}

// ---------------------------------------------------------------------------
// Map (root component)
// ---------------------------------------------------------------------------
export const Map = forwardRef(function Map(
  {
    center = [0, 0],
    zoom = 2,
    styles,
    theme,
    className = '',
    children,
    viewport,
    onViewportChange,
    loading = false,
    ...mapOptions
  },
  ref
) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Detect system/html dark mode if no explicit theme is passed
  const getTheme = useCallback(
    () =>
      theme ||
      (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    [theme]
  );

  const getStyleUrl = useCallback(
    (resolvedTheme) => {
      if (styles) {
        return resolvedTheme === 'dark'
          ? styles.dark || styles.light || DEFAULT_STYLES.dark
          : styles.light || styles.dark || DEFAULT_STYLES.light;
      }
      return resolvedTheme === 'dark' ? DEFAULT_STYLES.dark : DEFAULT_STYLES.light;
    },
    [styles]
  );

  // Expose MapLibre map instance via a stable proxy ref — works even before isLoaded
  useImperativeHandle(ref, () => ({
    flyTo: (...args) => mapRef.current?.flyTo(...args),
    easeTo: (...args) => mapRef.current?.easeTo(...args),
    setCenter: (...args) => mapRef.current?.setCenter(...args),
    setZoom: (...args) => mapRef.current?.setZoom(...args),
    getCenter: () => mapRef.current?.getCenter(),
    getZoom: () => mapRef.current?.getZoom(),
    setStyle: (...args) => mapRef.current?.setStyle(...args),
    on: (...args) => mapRef.current?.on(...args),
    off: (...args) => mapRef.current?.off(...args),
    once: (...args) => mapRef.current?.once(...args),
  }), []); // eslint-disable-line

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const resolvedTheme = getTheme();
    const styleUrl = getStyleUrl(resolvedTheme);

    const map = new MapLibreGL.Map({
      container: containerRef.current,
      style: styleUrl,
      center: center.length === 2 ? [center[0], center[1]] : center,
      zoom,
      attributionControl: false,
      ...mapOptions,
    });

    map.on('load', () => {
      setIsLoaded(true);
      setMapInstance(map);
    });

    if (onViewportChange) {
      map.on('moveend', () => {
        const c = map.getCenter();
        onViewportChange({
          longitude: c.lng,
          latitude: c.lat,
          zoom: map.getZoom(),
        });
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
      setIsLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync style when styles prop or theme changes
  useEffect(() => {
    if (!mapRef.current) return;
    const resolvedTheme = getTheme();
    const styleUrl = getStyleUrl(resolvedTheme);
    mapRef.current.setStyle(styleUrl);
  }, [styles, theme, getTheme, getStyleUrl]);

  // Sync viewport (center/zoom) when prop changes
  useEffect(() => {
    if (!mapRef.current || !viewport) return;
    mapRef.current.easeTo({
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom ?? mapRef.current.getZoom(),
      duration: 300,
    });
  }, [viewport]);

  return (
    <MapContext.Provider value={{ map: mapInstance, isLoaded }}>
      <div className={`relative h-full w-full ${className}`}>
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/70 dark:bg-slate-900/70">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gov-500 border-t-transparent" />
          </div>
        )}
        <div ref={containerRef} className="h-full w-full" />
        {isLoaded && children}
      </div>
    </MapContext.Provider>
  );
});

// ---------------------------------------------------------------------------
// MapControls
// ---------------------------------------------------------------------------
export function MapControls({
  position = 'bottom-right',
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  onLocate,
  className = '',
}) {
  const { map, isLoaded } = useMap();
  const addedRef = useRef(false);

  useEffect(() => {
    if (!map || !isLoaded || addedRef.current) return;
    addedRef.current = true;

    if (showZoom) {
      map.addControl(new MapLibreGL.NavigationControl({ showCompass }), position);
    }

    if (showLocate) {
      const geolocate = new MapLibreGL.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      });
      if (onLocate) {
        geolocate.on('geolocate', (e) => {
          onLocate({ longitude: e.coords.longitude, latitude: e.coords.latitude });
        });
      }
      map.addControl(geolocate, position);
    }

    if (showFullscreen) {
      map.addControl(new MapLibreGL.FullscreenControl(), position);
    }

    return () => {
      addedRef.current = false;
    };
  }, [map, isLoaded, position, showZoom, showCompass, showLocate, showFullscreen, onLocate]);

  return null;
}

// ---------------------------------------------------------------------------
// MapMarker
// ---------------------------------------------------------------------------
export function MapMarker({
  longitude,
  latitude,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  ...markerOptions
}) {
  const { map, isLoaded } = useMap();
  const markerRef = useRef(null);
  const elRef = useRef(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    // Create a container div for React portal
    const el = document.createElement('div');
    elRef.current = el;

    const marker = new MapLibreGL.Marker({ element: el, ...markerOptions })
      .setLngLat([longitude, latitude])
      .addTo(map);

    markerRef.current = marker;

    if (onClick) el.addEventListener('click', onClick);
    if (onMouseEnter) el.addEventListener('mouseenter', onMouseEnter);
    if (onMouseLeave) el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded]);

  // Update position
  useEffect(() => {
    markerRef.current?.setLngLat([longitude, latitude]);
  }, [longitude, latitude]);

  // Render children into the marker element via portal
  if (!elRef.current) return null;
  return ReactDOM.createPortal(
    <MarkerContext.Provider value={{ marker: markerRef.current, map }}>
      {children}
    </MarkerContext.Provider>,
    elRef.current
  );
}

// We need ReactDOM for Portal
import ReactDOM from 'react-dom';

// ---------------------------------------------------------------------------
// MarkerContext (internal)
// ---------------------------------------------------------------------------
const MarkerContext = createContext(null);

// ---------------------------------------------------------------------------
// MarkerContent — the visual element inside a marker
// ---------------------------------------------------------------------------
export function MarkerContent({ children, className = '' }) {
  if (children) {
    return <div className={className}>{children}</div>;
  }
  // Default: blue dot
  return (
    <div className={`h-4 w-4 rounded-full bg-blue-500 border-2 border-white shadow-md ${className}`} />
  );
}

// ---------------------------------------------------------------------------
// MarkerPopup — popup attached to marker, opens on click
// ---------------------------------------------------------------------------
export function MarkerPopup({ children, className = '', closeButton = false, ...popupOptions }) {
  const { map } = useContext(MarkerContext) || {};
  const { marker } = useContext(MarkerContext) || {};
  const popupRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!map || !marker) return;

    const container = document.createElement('div');
    containerRef.current = container;

    const popup = new MapLibreGL.Popup({
      closeButton,
      closeOnClick: true,
      className,
      ...popupOptions,
    });

    popup.setDOMContent(container);
    marker.setPopup(popup);
    popupRef.current = popup;

    return () => {
      popup.remove();
      popupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, marker]);

  if (!containerRef.current) return null;
  return ReactDOM.createPortal(children, containerRef.current);
}

// ---------------------------------------------------------------------------
// MarkerLabel — small text label above marker
// ---------------------------------------------------------------------------
export function MarkerLabel({ children, className = '' }) {
  return (
    <div
      className={`absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 text-xs text-white ${className}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MapPopup — standalone popup at a geographic position
// ---------------------------------------------------------------------------
export function MapPopup({
  longitude,
  latitude,
  children,
  className = '',
  closeButton = false,
  ...popupOptions
}) {
  const { map, isLoaded } = useMap();
  const containerRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (!map || !isLoaded) return;

    const container = document.createElement('div');
    containerRef.current = container;

    const popup = new MapLibreGL.Popup({ closeButton, className, ...popupOptions })
      .setLngLat([longitude, latitude])
      .setDOMContent(container)
      .addTo(map);

    popupRef.current = popup;

    return () => {
      popup.remove();
      popupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded]);

  // Update position
  useEffect(() => {
    popupRef.current?.setLngLat([longitude, latitude]);
  }, [longitude, latitude]);

  if (!containerRef.current) return null;
  return ReactDOM.createPortal(children, containerRef.current);
}

// ---------------------------------------------------------------------------
// MapRoute — draws a line between coordinates
// ---------------------------------------------------------------------------
export function MapRoute({
  coordinates,
  color = '#3b82f6',
  width = 4,
  opacity = 0.9,
}) {
  const { map, isLoaded } = useMap();
  const id = useId();
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  useEffect(() => {
    if (!map || !isLoaded || !coordinates?.length) return;

    map.addSource(sourceId, {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates },
      },
    });

    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': color,
        'line-width': width,
        'line-opacity': opacity,
      },
    });

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, isLoaded]);

  return null;
}

export { MapContext };
