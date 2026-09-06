import React from 'react';
import { User } from 'firebase/auth';
import { BookOpen, LogOut, ShieldCheck, Menu, Plus } from 'lucide-react';
import { logoutUser } from '../lib/firebase';

interface HeaderProps {
  user: User;
  onNewEntry: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onNewEntry,
  onToggleSidebar,
  isSidebarOpen,
}) => {
  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const displayName = user.displayName || user.email?.split('@')[0] || 'Journaler';
  const truncatedUid = user.uid.length > 10 ? `${user.uid.slice(0, 6)}...${user.uid.slice(-4)}` : user.uid;

  return (
    <header
      id="app-main-header"
      className="h-16 border-b border-stone-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30"
    >
      <div className="flex items-center space-x-3">
        {/* Toggle sidebar button on mobile */}
        <button
          id="toggle-sidebar-button"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? 'Close entries drawer' : 'Open entries drawer'}
          className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 active:bg-stone-200 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs">
            <BookOpen className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-stone-900 leading-none">
              Reflections
            </h1>
            <span className="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Isolated Cloud Firestore
            </span>
          </div>
        </div>
      </div>

      {/* Center / Action Button */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          id="header-new-entry-button"
          onClick={onNewEntry}
          className="inline-flex items-center space-x-1.5 text-xs font-medium px-3.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 active:scale-95 text-white transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Entry</span>
        </button>

        <div className="h-5 w-px bg-stone-200 hidden sm:block" />

        {/* Security badge */}
        <div
          id="security-indicator-pill"
          title={`Data isolated to UID: ${user.uid}`}
          className="hidden lg:flex items-center space-x-1.5 text-[11px] text-stone-600 bg-stone-100/90 border border-stone-200/80 px-2.5 py-1 rounded-full font-mono"
        >
          <ShieldCheck className="w-3 h-3 text-emerald-600" />
          <span>uid:{truncatedUid}</span>
        </div>

        {/* User profile & Logout */}
        <div className="flex items-center space-x-2 pl-1 sm:pl-2">
          {user.photoURL ? (
            <img
              id="user-avatar-image"
              src={user.photoURL}
              alt={displayName}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full border border-stone-200 object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center font-medium text-xs">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <span className="text-xs font-medium text-stone-700 hidden sm:inline max-w-[120px] truncate">
            {displayName}
          </span>

          <button
            id="signout-button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
