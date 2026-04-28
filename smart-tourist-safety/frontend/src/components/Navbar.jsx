import React from 'react';

/**
 * Navbar — Top navigation bar for the dashboard.
 * Shows brand, dark mode toggle, user greeting, notifications, and logout.
 */
const Navbar = ({ user, zoneCount, onLogout, onToggleSidebar, darkMode, onToggleDark }) => {
  return (
    <header className="bg-gradient-to-r from-gov-900 via-gov-800 to-gov-900 text-white shadow-lg z-30 relative">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: hamburger + brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Toggle sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-gradient-to-br from-gov-400 to-gov-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg leading-tight">Tourist Safety</h1>
              <p className="text-[10px] text-gov-300 font-medium tracking-wider uppercase">Monitoring System</p>
            </div>
          </div>
        </div>

        {/* Right: dark mode, notifications, user, logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors group"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <svg className="h-5 w-5 group-hover:scale-110 transition-transform text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Notification bell */}
          <button className="relative p-2 rounded-xl hover:bg-white/10 transition-colors group">
            <svg className="h-5 w-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {zoneCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-danger-500 rounded-full text-[10px] font-bold flex items-center justify-center ring-2 ring-gov-900 animate-pulse-soft">
                {zoneCount > 9 ? '9+' : zoneCount}
              </span>
            )}
          </button>

          {/* User info */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-safety-400 to-safety-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
              {user?.username?.charAt(0)?.toUpperCase() || 'T'}
            </div>
            <span className="text-sm font-medium">{user?.username || 'Tourist'}</span>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="p-2 rounded-xl hover:bg-red-500/20 transition-colors group"
            title="Logout"
          >
            <svg className="h-5 w-5 group-hover:text-red-300 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
