import React, { useEffect, useState } from 'react';

/**
 * ProximityAlert — Full-width alert banner that appears when the user
 * enters within 250m of a danger zone. Shows the zone description prominently.
 * Includes optional browser notification + alert sound.
 * Auto-dismisses after 10 seconds or can be manually closed.
 */
const ProximityAlert = ({ zone, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Play alert sound
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      // Three-tone warning beep
      playTone(880, 0, 0.15);
      playTone(880, 0.2, 0.15);
      playTone(1100, 0.4, 0.3);
    } catch {
      // AudioContext not available
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⚠️ Danger Zone Alert!', {
        body: zone?.comment || zone?.description || 'You are entering a reported danger zone.',
        icon: '🚨',
        tag: 'proximity-alert',
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Auto-dismiss after 10 seconds
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss?.(), 400);
    }, 10000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [onDismiss, zone]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss?.(), 400);
  };

  const description = zone?.comment || zone?.description || 'Unknown danger reported in this area.';

  return (
    <div
      className={`
        fixed top-20 left-1/2 -translate-x-1/2 z-[3000] w-[92vw] max-w-xl
        transition-all duration-400 ease-out
        ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-6 scale-95'}
      `}
    >
      <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 text-white rounded-2xl shadow-2xl shadow-red-500/40 overflow-hidden ring-2 ring-red-400/50">
        {/* Animated pulsing stripe */}
        <div className="h-1.5 bg-gradient-to-r from-yellow-300 via-red-300 to-yellow-300 animate-pulse" />

        <div className="px-5 py-4">
          <div className="flex items-start gap-4">
            {/* Animated alert icon */}
            <div className="flex-shrink-0 h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm ring-2 ring-white/30">
              <span className="text-2xl animate-bounce">🚨</span>
            </div>

            {/* Alert content */}
            <div className="flex-1 min-w-0">
              <h4 className="font-black text-lg tracking-tight">⚠️ DANGER ZONE ALERT</h4>
              <p className="text-red-100 text-sm mt-0.5">
                You are entering a reported danger zone!
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 p-2 rounded-xl hover:bg-white/20 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Zone description — prominent */}
          <div className="mt-3 p-3 bg-black/20 rounded-xl backdrop-blur-sm border border-white/10">
            <p className="text-sm font-semibold text-white leading-relaxed">
              📋 "{description}"
            </p>
            {zone?.location && (
              <p className="text-[11px] text-red-200 mt-1.5 flex items-center gap-1">
                📍 {zone.location.lat.toFixed(4)}, {zone.location.lng.toFixed(4)}
                <span className="mx-1">•</span>
                Radius: {zone.radius || 250}m
              </p>
            )}
          </div>

          {/* Action hint */}
          <p className="text-[11px] text-red-200 mt-2 text-center font-medium">
            🏃 Please exercise caution and consider leaving this area
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProximityAlert;
