import { useNavigate } from 'react-router-dom';
import { Settings, Bell, Shield, Globe, Moon, ChevronRight, User, LogOut, CheckCircle } from 'lucide-react';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import LanguageSelector from '../components/ui/LanguageSelector';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, patientId, patientName, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('settings.title', 'Settings')}</h2>
        <p className="text-sm text-slate-500">{t('settings.subtitle', 'Manage your MedAssist preferences')}</p>
      </div>

      {/* Account & Security Profile Card */}
      <Card>
        <CardHeader title="Account & Patient Identity" />
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {(patientName || 'P')[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{patientName || 'Demo Patient'}</p>
                <p className="text-xs text-slate-500">{user?.email || 'demo@medassist.ai'}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs rounded-full font-medium border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{isAuthenticated ? 'Authenticated' : 'Demo Mode'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs py-1">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 block mb-0.5">Isolated Patient ID</span>
              <span className="font-mono text-slate-700 break-all">{patientId || 'patient-demo-001'}</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 block mb-0.5">Data Isolation Status</span>
              <span className="text-slate-700 font-medium">PostgreSQL Scoped & Private</span>
            </div>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              icon={LogOut}
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              Sign Out of MedAssist
            </Button>
          </div>
        </div>
      </Card>

      {/* Language Preference Card */}
      <Card>
        <CardHeader title={t('settings.display_lang', 'Display Language')} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2">
          <div>
            <p className="text-sm font-medium text-slate-800">{t('settings.display_lang', 'Display Language')}</p>
            <p className="text-xs text-slate-500">{t('settings.lang_desc', 'Switch the application language instantly across all features')}</p>
          </div>
          <LanguageSelector variant="full" />
        </div>
      </Card>

      {/* Notifications Card */}
      <Card>
        <CardHeader title={t('settings.notifications', 'Notifications')} />
        <div className="space-y-3">
          {[
            { label: 'Medication reminders', description: 'Remind me to take medications', enabled: true },
            { label: 'Refill alerts', description: 'Alert when medication refill is due', enabled: true },
            { label: 'Lab result notifications', description: 'Notify when new reports are processed', enabled: false },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between py-1.5">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{s.label}</p>
                <p className="text-xs text-slate-500">{s.description}</p>
              </div>
              <button
                className={`relative w-10 h-5.5 rounded-full transition-colors ${s.enabled ? 'bg-blue-600' : 'bg-slate-200'} cursor-pointer`}
                role="switch"
                aria-checked={s.enabled}
                aria-label={s.label}
                style={{ minWidth: '40px', height: '22px' }}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${s.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* About Card */}
      <Card>
        <CardHeader title={t('settings.about', 'About')} />
        <div className="space-y-2 text-sm">
          {[
            { label: t('settings.version', 'Version'), value: '0.2.0 (HackXLerate 2026)' },
            { label: t('settings.build', 'Build'), value: 'Production Authenticated' },
            { label: 'Security', value: 'Supabase JWT + Patient Isolation' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0">
              <span className="text-slate-500">{label}</span>
              <span className="font-medium text-slate-700">{value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
