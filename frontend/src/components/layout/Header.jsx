import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, ChevronDown, LogOut, User, Shield } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import LanguageSelector from '../ui/LanguageSelector';

const routeKeyMap = {
  '/dashboard': 'nav.dashboard',
  '/documents': 'nav.documents',
  '/documents/upload': 'nav.upload',
  '/timeline': 'nav.timeline',
  '/trends': 'nav.trends',
  '/medications': 'nav.medications',
  '/copilot': 'nav.copilot',
  '/conflicts': 'nav.conflicts',
  '/alerts': 'nav.alerts',
  '/doctor-summary': 'nav.doctor_summary',
  '/emergency-card': 'nav.emergency_card',
  '/settings': 'nav.settings',
  '/privacy': 'nav.privacy',
};

export default function Header({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { t } = useLanguage();
  const { user, patientName, logout, isAuthenticated } = useAuth();
  const menuRef = useRef(null);

  const titleKey = routeKeyMap[location.pathname];
  const pageTitle = titleKey ? t(titleKey) : 'MedAssist';

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/login');
  };

  const displayName = user?.patientName || patientName || (user?.email ? user.email.split('@')[0] : 'Demo Patient');
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'P';

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-20">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold text-slate-900">{pageTitle}</h1>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Language Selector in Header */}
        <div className="mr-1">
          <LanguageSelector variant="compact" />
        </div>

        {/* Search (desktop only) */}
        <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:border-blue-300 hover:bg-white transition-colors cursor-pointer w-48">
          <Search className="w-4 h-4" />
          <span>{t('common.search', 'Search records...')}</span>
          <span className="ml-auto text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-mono">⌘K</span>
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border-2 border-white" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white rounded-xl border border-slate-200 shadow-lg py-2 z-50 animate-fade-in">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-4 py-2">{t('common.notifications', 'Notifications')}</p>
              {[
                { text: 'Vitamin D3 refill due in 12 days', time: '2h ago', dot: 'bg-amber-400' },
                { text: 'New AI insight: HbA1c improved 9%', time: '1d ago', dot: 'bg-blue-500' },
                { text: 'Annual lipid panel due this month', time: '3d ago', dot: 'bg-violet-500' },
              ].map((n, i) => (
                <button
                  key={i}
                  className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${n.dot}`} />
                  <div>
                    <p className="text-sm text-slate-700">{n.text}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                  </div>
                </button>
              ))}
              <div className="pt-2 px-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setNotifOpen(false);
                    navigate('/alerts');
                  }}
                  className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-700 py-1 cursor-pointer"
                >
                  View All Smart Alerts →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            aria-label="User menu"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {initials}
            </div>
            <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[120px] truncate">
              {displayName.split(' ')[0]}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-xl py-1.5 z-50 animate-fade-in">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email || 'demo@medassist.ai'}</p>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium w-fit">
                  <Shield className="w-3 h-3" />
                  <span>{isAuthenticated ? 'Isolated Patient Session' : 'Demo Mode'}</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors text-left cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>Account & Preferences</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
