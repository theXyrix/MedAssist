import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, FileText, Clock, TrendingUp, Pill,
  MessageSquare, Heart, Droplet, Activity, AlertCircle,
  ArrowRight, Sparkles, ChevronRight, BarChart3, Database,
  GitCompare, Bell,
} from 'lucide-react';
import Card, { CardHeader, StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { mockPatient, mockHealthMetrics, mockAIInsights } from '../data/mockPatient';
import { mockDocuments } from '../data/mockDocuments';
import { mockTimeline } from '../data/mockTimeline';
import { mockMedications } from '../data/mockMedications';
import { formatDateShort, formatTimeAgo, getStatusColor } from '../utils/helpers';
import { getPatient, getDocuments, getMedications, getTimeline, getObservations } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const metricIcons = {
  heart: Heart,
  droplet: Droplet,
  activity: Activity,
  percent: BarChart3,
};

const metricColors = {
  normal: '#10b981',
  warning: '#f59e0b',
  high: '#ef4444',
  critical: '#ef4444',
};

const insightIcons = {
  observation: { icon: Sparkles, color: 'text-blue-600', bg: 'bg-blue-50' },
  alert: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  reminder: { icon: Clock, color: 'text-violet-600', bg: 'bg-violet-50' },
};

const quickActions = [
  { transKey: 'nav.upload', label: 'Upload Document', to: '/documents/upload', icon: Upload, color: 'from-blue-500 to-blue-600' },
  { transKey: 'nav.copilot', label: 'AI Voice Copilot', to: '/copilot', icon: MessageSquare, color: 'from-violet-500 to-violet-600' },
  { transKey: 'nav.conflicts', label: 'Conflict Detector', to: '/conflicts', icon: GitCompare, color: 'from-amber-500 to-rose-600' },
  { transKey: 'nav.alerts', label: 'Smart Alerts', to: '/alerts', icon: Bell, color: 'from-red-500 to-red-600' },
  { transKey: 'nav.trends', label: 'Health Trends', to: '/trends', icon: TrendingUp, color: 'from-emerald-500 to-emerald-600' },
  { transKey: 'nav.timeline', label: 'Health Timeline', to: '/timeline', icon: Clock, color: 'from-teal-500 to-teal-600' },
];

export default function Dashboard() {
  const { t } = useLanguage();
  const [patientData, setPatientData] = useState(mockPatient);
  const [docsList, setDocsList] = useState(mockDocuments);
  const [medsList, setMedsList] = useState(mockMedications);
  const [eventsList, setEventsList] = useState(mockTimeline);
  const [metricsState, setMetricsState] = useState(mockHealthMetrics);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let active = true;
    getPatient('patient-demo-001').then((p) => {
      if (active && p) {
        setIsLive(true);
        setPatientData(prev => ({
          ...prev,
          name: p.name || prev.name,
          gender: p.gender || prev.gender,
          bloodType: p.blood_group || prev.bloodType,
          primaryConditions: p.primary_conditions || prev.primaryConditions,
        }));
      }
    });
    getDocuments('patient-demo-001').then((docs) => {
      if (active && docs && docs.length > 0) {
        setIsLive(true);
        setDocsList(docs.map(d => ({
          id: d.id,
          name: d.title || d.file_name,
          type: d.document_type,
          date: d.document_date || d.created_at?.slice(0, 10),
          status: d.processing_status || 'completed',
          summary: d.ai_summary || d.extracted_text || 'Processed medical document',
        })));
      }
    });
    getMedications('patient-demo-001').then((meds) => {
      if (active && meds && meds.length > 0) {
        setIsLive(true);
        setMedsList(meds);
      }
    });
    getTimeline('patient-demo-001').then((events) => {
      if (active && events && events.length > 0) {
        setIsLive(true);
        setEventsList(events);
      }
    });
    getObservations('patient-demo-001').then((obs) => {
      if (active && obs && obs.length > 0) {
        setIsLive(true);
        setMetricsState(prev => {
          return prev.map(metric => {
            const mLabel = metric.label.toLowerCase();
            const match = obs.find(o => {
              const tName = (o.test_name || '').toLowerCase();
              if (mLabel.includes('pressure') && (tName.includes('pressure') || tName.includes('bp'))) return true;
              if (mLabel.includes('glucose') && (tName.includes('glucose') || tName.includes('sugar'))) return true;
              if (mLabel.includes('hemoglobin') && tName.includes('hemoglobin') && !tName.includes('a1c')) return true;
              if (mLabel.includes('hba1c') && (tName.includes('hba1c') || tName.includes('a1c'))) return true;
              return false;
            });

            if (match) {
              const val = match.value_numeric !== undefined && match.value_numeric !== null
                ? match.value_numeric
                : (match.value_text || match.value || metric.value);
              return {
                ...metric,
                value: String(val),
                unit: match.unit || metric.unit,
                status: match.status || metric.status,
                lastChecked: (match.observed_at || '').slice(0, 10) || metric.lastChecked,
              };
            }
            return metric;
          });
        });
      }
    });
    return () => { active = false; };
  }, []);

  const activeMeds = medsList.filter(m => m.status === 'active');
  const recentDocs = docsList.slice(0, 4);
  const recentEvents = eventsList.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome + Patient Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Welcome */}
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 rounded-2xl p-6 text-white relative overflow-hidden">
          {/* Decorative circles */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -right-4 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute top-4 right-20 w-16 h-16 rounded-full bg-white/5" />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-blue-100 text-sm font-medium">{t('dashboard.welcome', 'Welcome back,')}</p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border backdrop-blur-sm ${
                    isLive
                      ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30'
                      : 'bg-white/15 text-blue-100 border-white/20'
                  }`}>
                    <Database className="w-3 h-3" />
                    {isLive ? t('common.live_data', 'Live Supabase Data') : t('common.demo_fallback', 'Demo Fallback')}
                  </span>
                </div>
                <h2 className="text-2xl font-bold font-display">{patientData.name}</h2>
                <p className="text-blue-200 text-sm mt-1">
                  {patientData.age} years • {patientData.gender} • Blood Type {patientData.bloodType}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-xl font-bold border border-white/20">
                {(patientData.name || 'AS').split(' ').map(n => n[0]).join('')}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(patientData.primaryConditions || []).map((c, i) => (
                <span key={i} className="text-xs bg-white/15 border border-white/20 rounded-full px-3 py-1 backdrop-blur-sm">
                  {c}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-blue-100">
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                {docsList.length} {t('dashboard.documents_count', 'Documents')}
              </span>
              <span className="flex items-center gap-1">
                <Pill className="w-3.5 h-3.5" />
                {activeMeds.length} {t('dashboard.meds_count', 'Active Medications')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {eventsList.length} {t('dashboard.timeline_count', 'Timeline Events')}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader title={t('dashboard.quick_actions', 'Quick Actions')} />
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-150 group"
              >
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <action.icon className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">{t(action.transKey, action.label)}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Health Metrics */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-700">{t('dashboard.health_metrics', 'Health Metrics')}</h2>
            {isLive && (
              <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                {t('dashboard.synchronized', 'Synchronized')}
              </span>
            )}
          </div>
          <Link to="/trends" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
            {t('dashboard.view_trends', 'View Trends')} <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metricsState.map((metric) => {
            const Icon = metricIcons[metric.icon] || Activity;
            return (
              <StatCard
                key={metric.id}
                label={metric.label}
                value={metric.value}
                unit={metric.unit}
                status={metric.status}
                icon={Icon}
                color={metricColors[metric.status] || '#3b82f6'}
              />
            );
          })}
        </div>
      </div>

      {/* Bottom section: AI Insight + Recent Docs + Recent Timeline + Meds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* AI Insights */}
        <Card>
          <CardHeader
            title={t('dashboard.ai_insights', 'AI Insights')}
            subtitle="Based on your uploaded records"
            action={
              <Badge variant="ai" size="xs">
                <Sparkles className="w-2.5 h-2.5 mr-1" />
                AI
              </Badge>
            }
          />
          <div className="space-y-3">
            {mockAIInsights.map((insight) => {
              const { icon: InsightIcon, color, bg } = insightIcons[insight.type] || insightIcons.observation;
              return (
                <div key={insight.id} className="flex gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <InsightIcon className={`w-3.5 h-3.5 ${color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-700 leading-relaxed">{insight.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{formatDateShort(insight.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Link to="/copilot" className="mt-3 flex items-center justify-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-700 py-2 rounded-lg hover:bg-blue-50 transition-colors">
            {t('nav.copilot', 'AI Copilot')} <ArrowRight className="w-3 h-3" />
          </Link>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader
            title={t('dashboard.recent_documents', 'Recent Documents')}
            action={
              <Link to="/documents" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                {t('dashboard.view_all', 'All')} <ChevronRight className="w-3 h-3" />
              </Link>
            }
          />
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <div key={doc.id} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{formatDateShort(doc.date)}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${getStatusColor(doc.status)}`}>
                      {doc.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link to="/documents/upload">
            <Button variant="outline" size="sm" icon={Upload} className="w-full mt-3">
              {t('nav.upload', 'Upload Document')}
            </Button>
          </Link>
        </Card>

        {/* Active Medications */}
        <Card>
          <CardHeader
            title={t('dashboard.active_medications', 'Active Medications')}
            subtitle={`${activeMeds.length} medications`}
            action={
              <Link to="/medications" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                {t('dashboard.view_all', 'All')} <ChevronRight className="w-3 h-3" />
              </Link>
            }
          />
          <div className="space-y-2">
            {activeMeds.map((med) => (
              <div key={med.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div
                  className="w-2 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: med.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800">{med.name} <span className="text-slate-400 font-normal">{med.dosage}</span></p>
                  <p className="text-[10px] text-slate-500 truncate">{med.frequency}</p>
                </div>
                {med.refillDue && new Date(med.refillDue) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                  <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    Refill Soon
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Timeline */}
      <Card>
        <CardHeader
          title="Recent Health Events"
          action={
            <Link to="/timeline" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              Full Timeline <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />
        <div className="space-y-3">
          {recentEvents.map((event, idx) => {
            const typeColors = {
              visit: 'bg-blue-500',
              lab: 'bg-violet-500',
              medication: 'bg-emerald-500',
              document: 'bg-slate-400',
              diagnosis: 'bg-red-500',
            };

            return (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${typeColors[event.type] || 'bg-slate-400'}`} />
                  {idx < recentEvents.length - 1 && (
                    <div className="w-px flex-1 bg-slate-200 mt-1" style={{ minHeight: '24px' }} />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-800">{event.title}</p>
                    <span className="text-xs text-slate-400 flex-shrink-0">{formatDateShort(event.date)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{event.hospital}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {event.highlights.slice(0, 2).map((h, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{h}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
