import React, { useState } from 'react';

/**
 * ZoneList — Scrollable list of all red zones with edit/delete actions.
 * Supports dark mode.
 */
const ZoneList = ({ zones, onDelete, onEditComment }) => {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  const handleStartEdit = (zone) => {
    setEditingId(zone._id);
    setEditText(zone.comment || zone.description || '');
  };

  const handleSaveEdit = (zoneId) => {
    if (editText.trim()) {
      onEditComment(zoneId, editText.trim());
    }
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  if (zones.length === 0) {
    return (
      <div className="stat-card text-center py-10">
        <div className="text-4xl mb-3">🛡️</div>
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-1">No Danger Zones</h3>
        <p className="text-sm text-slate-400 dark:text-slate-500">All areas are currently safe. Open the map to report unsafe areas.</p>
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <svg className="h-5 w-5 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          Danger Zones
        </h3>
        <span className="text-xs font-bold text-danger-600 dark:text-danger-400 bg-danger-50 dark:bg-danger-900/30 px-2.5 py-1 rounded-full">
          {zones.length} active
        </span>
      </div>

      <div className="space-y-2.5 max-h-80 overflow-y-auto scrollbar-thin pr-1">
        {zones.map((zone, index) => (
          <div
            key={zone._id}
            className="zone-item animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Zone indicator */}
            <div className="flex-shrink-0 mt-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-danger-400 to-danger-600 flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-bold">{index + 1}</span>
              </div>
            </div>

            {/* Zone details */}
            <div className="flex-1 min-w-0">
              {editingId === zone._id ? (
                <div className="space-y-2">
                  <textarea
                    className="w-full text-sm p-2 border border-gov-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-gov-500 focus:outline-none resize-none bg-white dark:bg-slate-700 dark:text-white"
                    rows="2"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleSaveEdit(zone._id)}
                      className="px-2.5 py-1 text-xs font-medium bg-gov-600 text-white rounded-lg hover:bg-gov-700 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {zone.comment || zone.description}
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    {zone.location.lat.toFixed(4)}, {zone.location.lng.toFixed(4)}
                    <span className="mx-1">•</span>
                    {new Date(zone.createdAt).toLocaleDateString()}
                  </p>
                </>
              )}
            </div>

            {/* Actions */}
            {editingId !== zone._id && (
              <div className="flex-shrink-0 flex gap-1">
                <button
                  onClick={() => handleStartEdit(zone)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-gov-600 dark:hover:text-gov-400 hover:bg-gov-50 dark:hover:bg-gov-900/30 transition-colors"
                  title="Edit comment"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(zone._id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/30 transition-colors"
                  title="Delete zone"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ZoneList;
