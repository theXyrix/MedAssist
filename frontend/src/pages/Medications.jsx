import { useState, useEffect, useCallback } from 'react';
import { Pill, Clock, AlertCircle, History, ChevronDown, ChevronUp, RefreshCw, Database } from 'lucide-react';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { mockMedications, MEDICATION_STATUS } from '../data/mockMedications';
import { formatDateShort, formatDate } from '../utils/helpers';
import { cn } from '../utils/helpers';
import { getMedications } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const STATUS_CONFIG = {
  [MEDICATION_STATUS.ACTIVE]: { label: 'Active', variant: 'success' },
  [MEDICATION_STATUS.DISCONTINUED]: { label: 'Discontinued', variant: 'default' },
  [MEDICATION_STATUS.ON_HOLD]: { label: 'On Hold', variant: 'warning' },
};

export default function Medications() {
  const { t } = useLanguage();
  const [medsList, setMedsList] = useState(mockMedications);
  const [expanded, setExpanded] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const fetchMeds = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiMeds = await getMedications('patient-demo-001');
      if (apiMeds && apiMeds.length > 0) {
        const mapped = apiMeds.map((m, idx) => ({
          ...m,
          color: m.color || ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][idx % 4],
          name: m.name || 'Medication',
          dosage: m.dosage || 'As prescribed',
          frequency: m.frequency || 'Daily',
          purpose: m.purpose || 'Condition management',
          instructions: m.instructions || 'Take as directed by doctor.',
          doctor: m.prescribed_by || 'Dr. Meena Patel',
          startDate: m.start_date || '2024-01-01',
          status: m.status || 'active',
        }));
        setMedsList(mapped);
        setIsLive(true);
      } else {
        setIsLive(false);
      }
    } catch {
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeds();
  }, [fetchMeds]);


  const activeMeds = medsList.filter(m => m.status === MEDICATION_STATUS.ACTIVE || m.status === 'active');
  const historyMeds = medsList.filter(m => m.status !== MEDICATION_STATUS.ACTIVE && m.status !== 'active');

  const MedCard = ({ med }) => {
    const isExpanded = expanded === med.id;
    const refillSoon = med.refillDue && new Date(med.refillDue) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return (
      <Card padding={false} className="overflow-hidden">
        <div
          className="flex items-start gap-4 p-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={() => setExpanded(isExpanded ? null : med.id)}
        >
          {/* Color indicator */}
          <div
            className="w-1 self-stretch rounded-full flex-shrink-0"
            style={{ backgroundColor: med.color }}
          />

          {/* Icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: `${med.color}18` }}
          >
            <Pill className="w-5 h-5" style={{ color: med.color }} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {med.name}
                  <span className="text-slate-400 font-normal ml-1">({med.brandName})</span>
                </h3>
                <p className="text-sm text-slate-600">{med.dosage} · {med.frequency}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={STATUS_CONFIG[med.status]?.variant || 'default'} size="xs">
                  {STATUS_CONFIG[med.status]?.label}
                </Badge>
                {isExpanded
                  ? <ChevronUp className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />
                }
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Since {formatDateShort(med.startDate)}
              </span>
              <span>{med.category}</span>
              <span>{med.prescribedBy}</span>
            </div>

            {refillSoon && med.status === MEDICATION_STATUS.ACTIVE && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 w-fit">
                <RefreshCw className="w-3 h-3" />
                Refill due {formatDateShort(med.refillDue)}
              </div>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50/50 animate-fade-in">
            <div className="ml-14 space-y-3 pt-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Purpose</p>
                <p className="text-sm text-slate-700">{med.purpose}</p>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Instructions</p>
                <p className="text-sm text-slate-700">{med.instructions}</p>
              </div>

              {med.sideEffectsToWatch?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    Side Effects to Watch
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {med.sideEffectsToWatch.map((se) => (
                      <span key={se} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                        {se}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {med.discontinuedReason && (
                <div className="p-3 bg-slate-100 rounded-lg">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Discontinued Reason</p>
                  <p className="text-sm text-slate-600">{med.discontinuedReason}</p>
                </div>
              )}

              {med.endDate && (
                <p className="text-xs text-slate-500">Discontinued: {formatDate(med.endDate)}</p>
              )}

              <p className="text-[10px] text-amber-600 italic">
                ⚕️ Do not alter medication based on this information. Always consult your prescribing physician.
              </p>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{t('meds.title', 'Medications')}</h2>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <Database className="w-3 h-3" />
              {isLive ? t('common.live_data', 'Live Supabase Data') : t('common.demo_fallback', 'Demo Fallback')}
            </span>
          </div>
          <p className="text-sm text-slate-500">{activeMeds.length} {t('common.active', 'active')} · {historyMeds.length} {t('meds.historical', 'historical')}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={fetchMeds}
          disabled={isLoading}
          className={isLoading ? 'animate-spin' : ''}
        >
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('common.active', 'Active'), value: activeMeds.length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: t('meds.refill_soon', 'Refill Soon'), value: activeMeds.filter(m => m.refillDue && new Date(m.refillDue) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: t('meds.historical', 'Historical'), value: historyMeds.length, color: 'text-slate-600', bg: 'bg-slate-50' },
        ].map((s) => (
          <Card key={s.label} className={cn('text-center py-3 border-0', s.bg)} padding={false}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Active medications */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">{t('meds.active_meds', 'Active Medications')}</h3>
        <div className="space-y-3">
          {activeMeds.map((med) => <MedCard key={med.id} med={med} />)}
        </div>
      </div>

      {/* History toggle */}
      {historyMeds.length > 0 && (
        <div>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            aria-expanded={showHistory}
          >
            <History className="w-4 h-4" />
            {showHistory ? t('meds.hide_history', 'Hide Medication History') : t('meds.show_history', 'Show Medication History')}
            ({historyMeds.length})
            {showHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-3 animate-fade-in opacity-70">
              {historyMeds.map((med) => <MedCard key={med.id} med={med} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
