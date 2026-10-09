import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Clock,
  TrendingUp,
  Pill,
  MessageSquare,
  Stethoscope,
  ShieldAlert,
  Settings,
  Lock,
  X,
  Activity,
  ChevronRight,
  GitCompare,
  Bell,
} from 'lucide-react';
import { cn } from '../../utils/helpers';
import { useLanguage } from '../../context/LanguageContext';

const navItems = [
  {
    groupKey: 'nav.main',
    defaultGroup: 'Main',
    items: [
      { to: '/dashboard', transKey: 'nav.dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/documents', transKey: 'nav.documents', label: 'Medical Documents', icon: FileText },
      { to: '/timeline', transKey: 'nav.timeline', label: 'Health Timeline', icon: Clock },
      { to: '/trends', transKey: 'nav.trends', label: 'Health Trends', icon: TrendingUp },
      { to: '/medications', transKey: 'nav.medications', label: 'Medications', icon: Pill },
    ],
  },
  {
    groupKey: 'nav.ai_features',
    defaultGroup: 'AI Features',
    items: [
      { to: '/copilot', transKey: 'nav.copilot', label: 'AI Copilot', icon: MessageSquare, badge: 'Voice' },
      { to: '/conflicts', transKey: 'nav.conflicts', label: 'Conflict Detector', icon: GitCompare, badge: 'Safety' },
      { to: '/alerts', transKey: 'nav.alerts', label: 'Health Alerts', icon: Bell, badge: 'Alerts' },
      { to: '/doctor-summary', transKey: 'nav.doctor_summary', label: 'Doctor Summary', icon: Stethoscope },
      { to: '/emergency-card', transKey: 'nav.emergency_card', label: 'Emergency Card', icon: ShieldAlert },
    ],
  },
];

const bottomItems = [
  { to: '/settings', transKey: 'nav.settings', label: 'Settings', icon: Settings },
  { to: '/privacy', transKey: 'nav.privacy', label: 'Privacy', icon: Lock },
];

export default function Sidebar({ open, onClose }) {
  const { t } = useLanguage();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-40 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Main navigation"
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
              <Activity className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 font-display">MedAssist</span>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5">Health Copilot</p>
            </div>
          </NavLink>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {navItems.map((group) => (
            <div key={group.groupKey}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5">
                {t(group.groupKey, group.defaultGroup)}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group relative',
                          isActive
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon
                            className={cn(
                              'w-4.5 h-4.5 flex-shrink-0 transition-colors',
                              isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                            )}
                            strokeWidth={isActive ? 2.5 : 2}
                          />
                          <span className="flex-1">{t(item.transKey, item.label)}</span>
                          {item.badge && (
                            <span className="text-[9px] font-bold bg-gradient-to-r from-blue-600 to-violet-600 text-white px-1.5 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                          {isActive && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-600 rounded-r-full" />
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom items */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-0.5">
          {bottomItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn('w-4 h-4', isActive ? 'text-blue-600' : 'text-slate-400')}
                  />
                  <span>{t(item.transKey, item.label)}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Disclaimer */}
          <div className="mt-3 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-[10px] text-amber-700 leading-relaxed">
              {t('common.disclaimer', 'MedAssist provides information based on uploaded records. It does not diagnose conditions or replace professional medical advice.')}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
