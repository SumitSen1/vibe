/**
 * zoneStorage.js — Resilient zone CRUD utility.
 *
 * Strategy: API-first with localStorage fallback.
 *   - Tries the backend API for every operation.
 *   - If the API call fails (401, network error, etc.), falls back to localStorage.
 *   - Keeps localStorage and API in sync when possible.
 */

const API_URL = 'http://localhost:5000/api/zones';
const LS_KEY = 'tourist_safety_zones';

// ── Helpers ────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function loadLocalZones() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalZones(zones) {
  localStorage.setItem(LS_KEY, JSON.stringify(zones));
}

function generateId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── CRUD Operations ────────────────────────────────────────────────

/**
 * Fetch all active zones. Tries API first, falls back to localStorage.
 */
export async function fetchZones() {
  try {
    const res = await fetch(API_URL, { headers: authHeaders() });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      // Merge API zones with any local-only zones
      const localZones = loadLocalZones();
      const apiIds = new Set(data.data.map((z) => z._id));
      const localOnly = localZones.filter((z) => !apiIds.has(z._id));
      const merged = [...data.data, ...localOnly];
      saveLocalZones(merged);
      return merged;
    }
  } catch {
    // API unavailable — serve from localStorage
  }
  return loadLocalZones();
}

/**
 * Create a new zone. Tries API, falls back to localStorage.
 */
export async function createZone({ lat, lng, description, comment, radius = 250 }) {
  // Try API first
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ lat, lng, description, comment, radius }),
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    if (data.success) {
      // Also save to localStorage for resilience
      const zones = loadLocalZones();
      zones.unshift(data.data);
      saveLocalZones(zones);
      return data.data;
    }
  } catch {
    // API failed — save to localStorage
  }

  // Fallback: save to localStorage
  const newZone = {
    _id: generateId(),
    location: { lat, lng },
    description: description || comment,
    comment: comment || description,
    radius,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  const zones = loadLocalZones();
  zones.unshift(newZone);
  saveLocalZones(zones);
  return newZone;
}

/**
 * Update a zone's comment/description. Tries API, falls back to localStorage.
 */
export async function updateZone(zoneId, { comment, description }) {
  // Try API first
  try {
    const res = await fetch(`${API_URL}/${zoneId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ comment, description }),
    });
    if (res.ok) {
      // Also update localStorage
      const zones = loadLocalZones();
      const idx = zones.findIndex((z) => z._id === zoneId);
      if (idx !== -1) {
        if (comment !== undefined) zones[idx].comment = comment;
        if (description !== undefined) zones[idx].description = description;
        saveLocalZones(zones);
      }
      return true;
    }
  } catch {
    // API failed
  }

  // Fallback: update in localStorage
  const zones = loadLocalZones();
  const idx = zones.findIndex((z) => z._id === zoneId);
  if (idx !== -1) {
    if (comment !== undefined) zones[idx].comment = comment;
    if (description !== undefined) zones[idx].description = description;
    saveLocalZones(zones);
    return true;
  }
  return false;
}

/**
 * Delete a zone. Tries API (soft-delete), falls back to localStorage (hard-delete).
 */
export async function deleteZone(zoneId) {
  // Try API first
  try {
    const res = await fetch(`${API_URL}/${zoneId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      // Also remove from localStorage
      const zones = loadLocalZones().filter((z) => z._id !== zoneId);
      saveLocalZones(zones);
      return true;
    }
  } catch {
    // API failed
  }

  // Fallback: remove from localStorage
  const zones = loadLocalZones().filter((z) => z._id !== zoneId);
  saveLocalZones(zones);
  return true;
}
