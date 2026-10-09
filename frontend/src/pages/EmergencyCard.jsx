import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  Phone,
  Heart,
  Droplet,
  AlertTriangle,
  Pill,
  User,
  Download,
  Wifi,
  WifiOff,
  HardDriveDownload,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { mockPatient } from '../data/mockPatient';
import { mockMedications, MEDICATION_STATUS } from '../data/mockMedications';
import { getEmergencyCard } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const OFFLINE_STORAGE_KEY = 'medassist_offline_emergency_card';

export default function EmergencyCard() {
  const { t } = useLanguage();
  const [cardData, setCardData] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineCache, setOfflineCache] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Monitor online / offline network state
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Read existing offline cache on mount
    try {
      const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (stored) {
        setOfflineCache(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to read offline emergency card cache:', e);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch live card data
  useEffect(() => {
    let mounted = true;
    getEmergencyCard('patient-demo-001').then((res) => {
      if (mounted && res) {
        setCardData(res);
      }
    });
    return () => { mounted = false; };
  }, []);

  // Determine active display data (live data takes precedence if online; cached data if offline)
  const isDisplayingOffline = !isOnline && offlineCache !== null;
  const activeSource = isDisplayingOffline && offlineCache?.patient ? offlineCache.patient : (cardData || mockPatient);
  const activeMeds = isDisplayingOffline && offlineCache?.patient?.active_medications
    ? offlineCache.patient.active_medications
    : (cardData?.current_medications || mockMedications.filter(m => m.status === MEDICATION_STATUS.ACTIVE || m.status === 'active'));

  // Feature 6: Save User-Approved Summary Offline
  const handleSaveOffline = () => {
    try {
      // Minimal necessary information sanitized - NEVER store tokens, secrets, or raw files
      const sanitizedPayload = {
        cached_at: new Date().toISOString(),
        patient: {
          name: activeSource.name || 'Arjun Sharma',
          blood_group: activeSource.blood_group || activeSource.bloodType || 'B+',
          date_of_birth: activeSource.dob || activeSource.date_of_birth || '1982-03-15',
          gender: activeSource.gender || 'male',
          age: activeSource.age || '42',
          allergies: activeSource.allergies || ['Penicillin', 'Sulfa drugs'],
          emergency_contact: activeSource.emergency_contact || mockPatient.emergencyContact,
          primary_conditions: activeSource.primary_conditions || mockPatient.primaryConditions,
          active_medications: activeMeds.map(m => ({
            id: m.id || m.name,
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
            purpose: m.purpose || 'Maintenance',
          })),
        },
      };

      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(sanitizedPayload));
      setOfflineCache(sanitizedPayload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save offline emergency card:', err);
    }
  };

  // Feature 6: Clear Offline Cache
  const handleClearOfflineCache = () => {
    try {
      localStorage.removeItem(OFFLINE_STORAGE_KEY);
      setOfflineCache(null);
      setClearSuccess(true);
      setTimeout(() => setClearSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{t('emergency.title', 'Emergency Health Card')}</h2>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Wifi className="w-3 h-3 text-emerald-600" />
                {t('common.online', 'Online')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <WifiOff className="w-3 h-3 text-amber-600" />
                {t('common.offline', 'Offline Mode')}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">{t('emergency.subtitle', 'Critical health information available offline for first responders')}</p>
        </div>

        {/* Offline Cache Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={HardDriveDownload}
            onClick={handleSaveOffline}
            className="text-xs"
          >
            {saveSuccess
              ? t('emergency.saved_offline', 'Saved Offline!')
              : offlineCache
              ? t('emergency.update_offline', 'Update Offline Cache')
              : t('emergency.save_offline', 'Save for Offline Use')}
          </Button>

          {offlineCache && (
            <Button
              variant="ghost"
              size="sm"
              icon={Trash2}
              onClick={handleClearOfflineCache}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Remove stored card from this device"
            >
              {t('emergency.clear_cache', 'Clear Cache')}
            </Button>
          )}
        </div>
      </div>

      {/* Offline Status & Warning Banners */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Offline Emergency Mode Active</p>
            <p className="mt-0.5 leading-relaxed">
              Displaying locally cached card from{' '}
              <strong>{offlineCache?.cached_at ? new Date(offlineCache.cached_at).toLocaleString() : 'Previous Session'}</strong>. 
              Offline data may be outdated if recent prescriptions or lab tests have not synchronized.
            </p>
          </div>
        </div>
      )}

      {isOnline && offlineCache && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Offline Copy Ready (Last saved: {new Date(offlineCache.cached_at).toLocaleDateString()} {new Date(offlineCache.cached_at).toLocaleTimeString()})
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Zero credentials stored</span>
        </div>
      )}

      {/* Emergency Card Display */}
      <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <ShieldAlert className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <p className="text-red-100 text-xs">Emergency Health Card</p>
                <p className="font-bold text-sm">
                  MedAssist · {isDisplayingOffline ? 'Offline Stored Copy' : 'Verified Profile'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-red-200 text-xs">{t('emergency.blood_type', 'Blood Type')}</p>
              <p className="text-3xl font-black">{activeSource.blood_group || activeSource.bloodType || 'B+'}</p>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-red-200 text-xs mb-0.5">Patient Name</p>
            <p className="text-xl font-bold">{activeSource.name || 'Arjun Sharma'}</p>
            <p className="text-red-200 text-sm">
              {activeSource.age || '42'} years · {activeSource.gender || 'male'} · DOB: {activeSource.dob || activeSource.date_of_birth || '1982-03-15'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Allergies */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <p className="text-red-200 text-xs font-medium mb-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {t('emergency.known_allergies', 'Known Allergies')}
              </p>
              {(activeSource.allergies || ['Penicillin', 'Sulfa drugs']).map((a, i) => (
                <p key={i} className="text-sm font-semibold">⚠️ {typeof a === 'object' ? a.substance : a}</p>
              ))}
            </div>

            {/* Emergency contact */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <p className="text-red-200 text-xs font-medium mb-1.5 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {t('emergency.contact', 'Emergency Contact')}
              </p>
              <p className="text-sm font-semibold">{mockPatient.emergencyContact.name}</p>
              <p className="text-xs text-red-200">{mockPatient.emergencyContact.relation}</p>
              <p className="text-sm font-semibold mt-1">{mockPatient.emergencyContact.phone}</p>
            </div>
          </div>

          {/* Conditions */}
          <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
            <p className="text-red-200 text-xs font-medium mb-1.5 flex items-center gap-1">
              <Heart className="w-3 h-3" />
              {t('emergency.conditions', 'Primary Conditions')}
            </p>
            <div className="flex flex-wrap gap-2">
              {(activeSource.primary_conditions || mockPatient.primaryConditions).map((c) => (
                <span key={c} className="text-xs bg-white/15 border border-white/20 rounded-full px-2.5 py-1">{c}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active medications quick list */}
      <Card>
        <CardHeader
          title={t('emergency.medications', 'Current Medications')}
          subtitle="Critical info for emergency responders"
        />
        <div className="space-y-2">
          {activeMeds.map((med, idx) => (
            <div key={med.id || idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-6 rounded-full flex-shrink-0 bg-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{med.name} <span className="text-slate-400 font-normal">{med.dosage}</span></p>
                <p className="text-xs text-slate-500">{med.frequency} · {med.purpose || 'Maintenance'}</p>
              </div>
              <Pill className="w-4 h-4 text-slate-300" />
            </div>
          ))}
        </div>
      </Card>

      {/* Physician */}
      <Card>
        <CardHeader title="Primary Physician" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">{mockPatient.primaryPhysician.name}</p>
            <p className="text-sm text-slate-600">{mockPatient.primaryPhysician.specialty}</p>
            <p className="text-sm font-medium text-blue-600 mt-0.5">{mockPatient.primaryPhysician.phone}</p>
          </div>
        </div>
      </Card>

      {/* Safety Notice */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
        ⚕️ {t('emergency.privacy_note', 'Privacy & Emergency Protocol: This emergency card stores minimal necessary facts. No auth tokens or document files are stored on this device.')}
      </div>
    </div>
  );
}
