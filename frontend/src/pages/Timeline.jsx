import { useState, useEffect, useCallback } from 'react';
import {
  Clock, Beaker, Pill, FileText, AlertTriangle,
  Hospital, ChevronDown, ChevronUp, Filter, RefreshCw, Database
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { mockTimeline, TIMELINE_EVENT_TYPES } from '../data/mockTimeline';
import { formatDateShort, formatDate } from '../utils/helpers';
import { getTimeline } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const TYPE_CONFIG = {
  [TIMELINE_EVENT_TYPES.VISIT]: {
    label: 'Visit',
    icon: Hospital,
    dotColor: 'bg-blue-500',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  [TIMELINE_EVENT_TYPES.LAB]: {
    label: 'Lab',
    icon: Beaker,
    dotColor: 'bg-violet-500',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
  },
  [TIMELINE_EVENT_TYPES.MEDICATION]: {
    label: 'Medication',
    icon: Pill,
    dotColor: 'bg-emerald-500',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600',
  },
  [TIMELINE_EVENT_TYPES.DOCUMENT]: {
    label: 'Document',
    icon: FileText,
    dotColor: 'bg-slate-400',
    badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
    iconBg: 'bg-slate-50',
    iconColor: 'text-slate-500',
  },
  [TIMELINE_EVENT_TYPES.DIAGNOSIS]: {
    label: 'Diagnosis',
    icon: AlertTriangle,
    dotColor: 'bg-red-500',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-600',
  },
};

const SEVERITY_BADGE = {
  normal: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  critical: 'bg-red-50 text-red-700',
};

export default function Timeline() {
  const { t } = useLanguage();
  const [eventsList, setEventsList] = useState(mockTimeline);
  const [activeFilter, setActiveFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const filterOptions = [
    { key: 'All', label: t('timeline.all_events', 'All Events') },
    { key: TIMELINE_EVENT_TYPES.VISIT, label: t('timeline.visits', 'Visits') },
    { key: TIMELINE_EVENT_TYPES.LAB, label: t('timeline.labs', 'Labs') },
    { key: TIMELINE_EVENT_TYPES.MEDICATION, label: t('timeline.medications', 'Medications') },
    { key: TIMELINE_EVENT_TYPES.DIAGNOSIS, label: t('timeline.diagnoses', 'Diagnoses') },
  ];

  const fetchTimeline = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiEvents = await getTimeline('patient-demo-001');
      if (apiEvents && apiEvents.length > 0) {
        const mapped = apiEvents.map(e => ({
          id: e.id,
          date: e.event_date || e.date,
          type: e.event_type || e.type || 'document',
          title: e.title || 'Health Event',
          hospital: e.hospital || 'Apollo Hospitals',
          doctor: e.physician || 'Dr. Meena Patel',
          description: e.description || '',
          severity: e.severity || 'normal',
          highlights: e.highlights || [],
        }));
        setEventsList(mapped);
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
    fetchTimeline();
  }, [fetchTimeline]);

  const filtered = activeFilter === 'All'
    ? eventsList
    : eventsList.filter(e => e.type === activeFilter);

  const grouped = filtered.reduce((acc, event) => {
    const year = new Date(event.date).getFullYear();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});

  const years = Object.keys(grouped).sort((a, b) => b - a);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{t('timeline.title', 'Health Timeline')}</h2>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <Database className="w-3 h-3" />
              {isLive ? t('common.live_data', 'Live Supabase Data') : t('common.demo_fallback', 'Demo Fallback')}
            </span>
          </div>
          <p className="text-sm text-slate-500">{eventsList.length} events across your medical history</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={RefreshCw}
          onClick={fetchTimeline}
          disabled={isLoading}
          className={isLoading ? 'animate-spin' : ''}
        >
          {t('common.refresh', 'Refresh')}
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((opt) => {
          const count = opt.key === 'All'
            ? eventsList.length
            : eventsList.filter(e => e.type === opt.key).length;
          return (
            <button
              key={opt.key}
              onClick={() => setActiveFilter(opt.key)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-150
                ${activeFilter === opt.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600'
                }
              `}
              aria-pressed={activeFilter === opt.key}
            >
              {opt.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeFilter === opt.key ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>


      {/* Timeline grouped by year */}
      <div className="space-y-8">
        {years.map((year) => (
          <div key={year}>
            {/* Year label */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-base font-bold text-slate-700">{year}</span>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">{grouped[year].length} event{grouped[year].length > 1 ? 's' : ''}</span>
            </div>

            {/* Events */}
            <div className="relative pl-6">
              {/* Vertical line */}
              <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200" />

              <div className="space-y-4">
                {grouped[year].map((event) => {
                  const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG[TIMELINE_EVENT_TYPES.DOCUMENT];
                  const TypeIcon = cfg.icon;
                  const isExpanded = expandedId === event.id;

                  return (
                    <div key={event.id} className="relative">
                      {/* Dot */}
                      <div className={`absolute -left-6 top-4 w-5 h-5 rounded-full ${cfg.dotColor} flex items-center justify-center border-2 border-white shadow-sm`}>
                        <TypeIcon className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                      </div>

                      <Card padding={false} className="p-4 hover:border-slate-300 transition-all">
                        {/* Header row */}
                        <button
                          className="w-full flex items-start gap-3 text-left"
                          onClick={() => setExpandedId(isExpanded ? null : event.id)}
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${event.title}`}
                        >
                          <div className={`w-8 h-8 rounded-lg ${cfg.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <TypeIcon className={`w-4 h-4 ${cfg.iconColor}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold text-slate-900">{event.title}</h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-slate-400">{formatDateShort(event.date)}</span>
                                {isExpanded
                                  ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                  : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                }
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                                {cfg.label}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEVERITY_BADGE[event.severity] || SEVERITY_BADGE.normal}`}>
                                {event.severity}
                              </span>
                              <span className="text-xs text-slate-500">{event.hospital}</span>
                            </div>

                            {/* Highlights always visible */}
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {event.highlights.slice(0, isExpanded ? event.highlights.length : 2).map((h, i) => (
                                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                  {h}
                                </span>
                              ))}
                            </div>
                          </div>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-slate-100 pl-11 space-y-2 animate-fade-in">
                            <p className="text-sm text-slate-600 leading-relaxed">{event.description}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{formatDate(event.date)}</span>
                              {event.doctor && (
                                <>
                                  <span>•</span>
                                  <span>{event.doctor}</span>
                                </>
                              )}
                            </div>
                            <p className="text-[10px] text-amber-600 italic">
                              ⚕️ This is a record from your uploaded documents. Consult your physician for medical interpretation.
                            </p>
                          </div>
                        )}
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
