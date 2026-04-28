import React, { useState } from 'react';

/**
 * CommentModal — Modal overlay for adding a comment when creating a new zone.
 * Supports dark mode.
 */
const CommentModal = ({ latlng, onSubmit, onCancel }) => {
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (comment.trim()) {
      onSubmit(comment.trim());
    }
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-danger-500 to-danger-600 px-6 py-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Report Danger Zone
          </h3>
          <p className="text-danger-100 text-sm mt-1">
            📍 {latlng.lat.toFixed(5)}, {latlng.lng.toFixed(5)}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
            Describe the danger
          </label>
          <textarea
            className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-xl text-sm focus:ring-2 focus:ring-danger-400 focus:border-danger-400 focus:outline-none resize-none transition-all bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
            rows="4"
            placeholder="e.g., Theft hotspot, unlit street, aggressive vendors..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            autoFocus
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 text-right">
            {comment.length}/500 characters
          </p>

          {/* Zone info */}
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <div className="h-3 w-3 rounded-full bg-danger-400"></div>
              <span>Zone radius: <strong className="text-slate-700 dark:text-slate-200">250 meters</strong></span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!comment.trim()}
            className="px-5 py-2 text-sm font-bold bg-danger-600 text-white rounded-xl hover:bg-danger-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            🚨 Report Zone
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommentModal;
