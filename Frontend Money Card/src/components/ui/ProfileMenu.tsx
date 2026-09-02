// ─── Profile Menu Component ─────────────────────────────────
// Accessible user profile dropdown for the top bar (SUPER_ADMIN & ORG_ADMIN).
// Contains Profile Info, Settings, and Sign Out.
// NO "Forgot Password" is in this dropdown.

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks';
import { LogOut, ChevronDown, ShieldCheck, Settings } from 'lucide-react';
import { cn } from '@/utils';

export function ProfileMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
        className="flex items-center gap-2.5 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-1.5 transition-all hover:border-slate-700 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-xs font-bold text-white shadow-md shadow-violet-500/20">
          {userInitial}
        </div>
        <div className="hidden text-left sm:block">
          <p className="max-w-[120px] truncate text-xs font-semibold text-slate-200">
            {user?.name || 'Admin'}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Org Admin'}
          </p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-slate-400 transition-transform duration-200',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-800 bg-slate-900/95 py-2 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95"
        >
          {/* Header Info */}
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-sm font-bold text-violet-400">
                {userInitial}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-sm font-medium text-slate-100">{user?.name}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-md bg-slate-950 px-2 py-1 text-[11px] font-medium text-violet-400 border border-slate-800">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-400 shrink-0" />
              <span>Role: {user?.role ? (user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Org Admin') : 'Loading...'}</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              role="menuitem"
              onClick={() => {
                setIsOpen(false);
                navigate('/settings');
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800/70 hover:text-slate-100 focus-visible:outline-none focus-visible:bg-slate-800"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              Account Settings
            </button>
          </div>

          {/* Footer Action */}
          <div className="border-t border-slate-800 pt-1">
            <button
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-none focus-visible:bg-rose-500/10"
            >
              <LogOut className="h-4 w-4 text-rose-400" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
