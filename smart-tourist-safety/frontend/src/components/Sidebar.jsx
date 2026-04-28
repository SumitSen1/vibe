import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Sidebar — Vertical navigation with links, zone count badge, and mobile collapse.
 * Supports dark mode via parent class.
 */
const Sidebar = ({ isOpen, onClose, zoneCount }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: 'Full Map',
      path: '/dashboard/map',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      label: 'Danger Zones',
      path: '/dashboard',
      hash: '#zones',
      badge: zoneCount,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
  ];

  const handleNav = (item) => {
    navigate(item.path);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-16 left-0 bottom-0 z-40 w-64 glass-sidebar
          transform transition-transform duration-300 ease-out
          lg:translate-x-0 lg:static lg:z-10
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Nav links */}
          <nav className="flex-1 px-3 py-6 space-y-1.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path && !item.hash;
              return (
                <button
                  key={item.label}
                  onClick={() => handleNav(item)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                    transition-all duration-200 group
                    ${isActive
                      ? 'bg-gov-700 text-white shadow-lg shadow-gov-700/25'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-gov-50 dark:hover:bg-slate-700 hover:text-gov-700 dark:hover:text-white'
                    }
                  `}
                >
                  <span className={`${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-gov-500 dark:group-hover:text-gov-400'} transition-colors`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                  {item.badge > 0 && (
                    <span className={`
                      ml-auto px-2 py-0.5 rounded-full text-xs font-bold
                      ${isActive ? 'bg-white/20 text-white' : 'bg-danger-100 dark:bg-danger-900/50 text-danger-700 dark:text-danger-300'}
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom info */}
          <div className="px-4 py-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <div className="h-2 w-2 rounded-full bg-safety-400 animate-pulse-soft"></div>
              <span>System Active</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
