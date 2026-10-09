import { useState, useEffect, useCallback } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  RefreshCw,
  Database,
  Calendar,
  FileText,
  AlertTriangle,
  Globe,
  Sparkles,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { mockLabs, labBiomarkers } from '../data/mockLabs';
import { cn } from '../utils/helpers';
import { getObservations, getHealthChanges } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const STATUS_CONFIG = {
  normal: { label: 'Normal', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  warning: { label: 'Borderline', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  high: { label: 'Elevated', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  low: { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
};

const CustomTooltip = ({ active, payload, label, unit, normalRange }) => {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value;
  const status = value > normalRange.max ? 'high' : value < normalRange.min ? 'low' : 'normal';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.normal;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-base font-bold" style={{ color: payload[0]?.color }}>
        {value} {unit}
      </p>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
        {cfg.label}
      </span>
    </div>
  );
};

export default function Trends() {
  const [activeTab, setActiveTab] = useState('charts'); // charts | change_intelligence
  const [labsState, setLabsState] = useState(mockLabs);
  const [selectedBiomarker, setSelectedBiomarker] = useState('hemoglobin');
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Feature 2: Health Change Intelligence state
  const [changeData, setChangeData] = useState(null);
  const { language, setLanguage, t } = useLanguage();
  const [isChangesLoading, setIsChangesLoading] = useState(false);

  const fetchObservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const obs = await getObservations('patient-demo-001');
      if (obs && obs.length > 0) {
        setIsLive(true);
        setLabsState((prev) => {
          const next = { ...prev };
          obs.forEach((o) => {
            const name = (o.test_name || '').toLowerCase();
            let key = null;
            if (name.includes('hba1c')) key = 'hba1c';
            else if (name.includes('glucose') || name.includes('sugar')) key = 'glucose';
            else if (name.includes('hemo')) key = 'hemoglobin';
            else if (name.includes('ldl')) key = 'ldl';
            else if (name.includes('cholesterol')) key = 'cholesterol';

            if (key && next[key]) {
              const val = o.value_numeric || o.value;
              if (val !== undefined && val !== null) {
                const dateLabel = (o.observed_at || '').slice(0, 10);
                const exists = next[key].data.some(d => d.date === dateLabel);
                if (!exists) {
                  next[key] = {
                    ...next[key],
                    data: [
                      ...next[key].data,
                      {
                        date: dateLabel,
                        value: Number(val),
                        status: o.status || 'normal',
                      }
                    ].sort((a, b) => new Date(a.date) - new Date(b.date))
                  };
                }
              }
            }
          });
          return next;
        });
      } else {
        setIsLive(false);
      }
    } catch {
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchChanges = useCallback(async (lang) => {
    setIsChangesLoading(true);
    try {
      const res = await getHealthChanges('patient-demo-001', lang);
      setChangeData(res);
    } catch (err) {
      console.error('Failed to fetch health changes:', err);
    } finally {
      setIsChangesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  useEffect(() => {
    if (activeTab === 'change_intelligence') {
      fetchChanges(language);
    }
  }, [activeTab, language, fetchChanges]);

  const lab = labsState[selectedBiomarker] || mockLabs[selectedBiomarker];

  if (!lab) return null;

  const latestData = lab.data[lab.data.length - 1];
  const previousData = lab.data[lab.data.length - 2];
  const trend = previousData
    ? latestData.value > previousData.value ? 'up' : latestData.value < previousData.value ? 'down' : 'stable'
    : 'stable';

  const trendIcon = trend === 'up'
    ? <TrendingUp className="w-4 h-4 text-red-500" />
    : trend === 'down'
    ? <TrendingDown className="w-4 h-4 text-emerald-500" />
    : <Minus className="w-4 h-4 text-slate-400" />;

  const latestStatus = STATUS_CONFIG[latestData.status] || STATUS_CONFIG.normal;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{t('trends.title', 'Health Trends & Intelligence')}</h2>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <Database className="w-3 h-3" />
              {isLive ? t('common.live_data', 'Live Supabase Data') : t('common.demo_fallback', 'Demo Fallback')}
            </span>
          </div>
          <p className="text-xs text-slate-500">{t('trends.subtitle', 'Chronological analysis, biomarker charts, and cross-report delta intelligence')}</p>
        </div>

        {/* View Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'charts'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('trends.tab_charts', 'Biomarker Charts')}
          </button>
          <button
            onClick={() => setActiveTab('change_intelligence')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'change_intelligence'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t('trends.tab_change_intel', 'Change Intelligence')}
          </button>
        </div>
      </div>

      {/* TAB 1: BIOMARKER CHARTS */}
      {activeTab === 'charts' && (
        <div className="space-y-5">
          {/* Biomarker selector — horizontal scroll on mobile */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {labBiomarkers.map((b) => {
              const bLab = labsState[b.key] || mockLabs[b.key];
              const bLatest = bLab?.data[bLab.data.length - 1];
              return (
                <button
                  key={b.key}
                  onClick={() => setSelectedBiomarker(b.key)}
                  className={cn(
                    'flex-shrink-0 flex flex-col items-start px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-150 min-w-[140px]',
                    selectedBiomarker === b.key
                      ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200'
                  )}
                  aria-pressed={selectedBiomarker === b.key}
                >
                  <span className="font-semibold text-sm">{b.label}</span>
                  {bLatest && (
                    <span className="text-lg font-bold mt-0.5" style={{ color: bLab.color }}>
                      {bLatest.value}
                      <span className="text-xs font-normal text-slate-400 ml-1">{bLab.unit}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Main chart */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{lab.label}</h3>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${latestStatus.bg} ${latestStatus.color}`}>
                    {latestStatus.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> {lab.referenceLabel}
                </p>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Latest</p>
                  <p className="font-bold text-slate-900">{latestData.value} <span className="text-slate-400 font-normal">{lab.unit}</span></p>
                </div>
                {previousData && (
                  <div>
                    <p className="text-xs text-slate-500">Previous</p>
                    <p className="font-bold text-slate-900">{previousData.value} <span className="text-slate-400 font-normal">{lab.unit}</span></p>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  {trendIcon}
                  <span className="text-xs font-medium text-slate-600 capitalize">{trend}</span>
                </div>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lab.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`gradient-${selectedBiomarker}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={lab.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={lab.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} tickLine={false} />
                  <Tooltip content={<CustomTooltip unit={lab.unit} normalRange={lab.normalRange} />} />
                  <ReferenceLine y={lab.normalRange.max} stroke="#f87171" strokeDasharray="3 3" label={{ value: `Max: ${lab.normalRange.max}`, fill: '#ef4444', fontSize: 10, position: 'right' }} />
                  {lab.normalRange.min > 0 && (
                    <ReferenceLine y={lab.normalRange.min} stroke="#60a5fa" strokeDasharray="3 3" label={{ value: `Min: ${lab.normalRange.min}`, fill: '#3b82f6', fontSize: 10, position: 'right' }} />
                  )}
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={lab.color}
                    strokeWidth={2.5}
                    fill={`url(#gradient-${selectedBiomarker})`}
                    dot={{ fill: lab.color, r: 4, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: FEATURE 2 — HEALTH CHANGE INTELLIGENCE */}
      {activeTab === 'change_intelligence' && (
        <div className="space-y-5">
          {/* Language Selector Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('trends.multilingual_header', 'Multilingual Chronological Change Explanations')}</h3>
              <p className="text-xs text-slate-500">{t('trends.multilingual_sub', 'Calculates mathematical deltas across matching units and explains shifts in plain language')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Language selector for changes"
              >
                <option value="en">English</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                icon={RefreshCw}
                onClick={() => fetchChanges(language)}
                loading={isChangesLoading}
                className="text-xs"
              >
                {t('common.refresh', 'Refresh')}
              </Button>
            </div>
          </div>

          {/* Change Cards Feed */}
          {isChangesLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              Comparing dated observations and verifying unit compatibility...
            </div>
          ) : !changeData?.changes || changeData.changes.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              <p className="text-sm font-semibold text-slate-800">Need at least 2 dated reports to compare trends</p>
              <p className="text-xs text-slate-400 mt-1">Upload additional diagnostic reports to observe chronological changes.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {changeData.changes.map((item, idx) => {
                const isIncreased = item.delta > 0;
                const isDecreased = item.delta < 0;
                const isCompatible = item.units_compatible;

                return (
                  <Card key={idx} className="p-5 border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{item.test_name}</h4>
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                            {item.unit}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.readings_count} recorded measurements on file
                        </p>
                      </div>

                      {/* Delta Badge */}
                      {isCompatible ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1 ${
                              isIncreased
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : isDecreased
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isIncreased ? '▲' : isDecreased ? '▼' : '▬'} {item.delta > 0 ? `+${item.delta}` : item.delta} {item.unit}
                            {item.percentage_change !== null && (
                              <span className="text-[10px] opacity-80">({item.percentage_change > 0 ? `+${item.percentage_change}` : item.percentage_change}%)</span>
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {t('trends.differing_units', 'Differing Units')}
                        </span>
                      )}
                    </div>

                    {/* Baseline vs Latest Grid */}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-slate-400">{t('trends.baseline', 'Baseline Measurement')}</span>
                        <p className="text-sm font-bold text-slate-900 mt-1">
                          {item.baseline.value} {item.baseline.unit}
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {item.baseline.date} · {item.baseline.source_document_title}
                        </p>
                      </div>

                      <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-200">
                        <span className="text-[10px] uppercase font-bold text-blue-600">{t('trends.latest_measurement', 'Latest Measurement')}</span>
                        <p className="text-sm font-bold text-blue-950 mt-1">
                          {item.latest.value} {item.latest.unit}
                        </p>
                        <p className="text-blue-800 text-[11px] mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {item.latest.date} · {item.latest.source_document_title}
                        </p>
                      </div>
                    </div>

                    {/* Plain Language Explanation */}
                    <div className="mt-3 p-3 bg-slate-50/80 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
                      <span className="font-semibold text-slate-900">{t('trends.explanation_label', 'Clinical Explanation')}: </span>
                      {item.explanation}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Medical Safety Disclaimer */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 italic">
            ⚕️ {changeData?.disclaimer || "Recorded measurement shifts represent historical lab reports only. MedAssist does not diagnose conditions or extrapolate future disease states."}
          </div>
        </div>
      )}
    </div>
  );
}
