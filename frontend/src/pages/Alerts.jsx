import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  Clock,
  ShieldCheck,
  FileText,
  RefreshCw,
  Filter,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { getSmartAlerts, updateAlertStatus } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

export default function Alerts() {
  const { t } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | urgent | informational | reviewed
  const [updatingId, setUpdatingId] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSmartAlerts('patient-demo-001');
      setAlerts(data || []);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const toggleReviewStatus = async (alertId, currentStatus) => {
    setUpdatingId(alertId);
    const newStatus = currentStatus === 'reviewed' ? 'unreviewed' : 'reviewed';
    try {
      await updateAlertStatus(alertId, newStatus);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, review_status: newStatus } : a))
      );
    } catch (err) {
      console.error('Failed to update alert:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'all') return a.review_status !== 'reviewed';
    if (filter === 'urgent') return a.severity === 'urgent_safety_notice' && a.review_status !== 'reviewed';
    if (filter === 'informational') return a.severity === 'informational' && a.review_status !== 'reviewed';
    if (filter === 'reviewed') return a.review_status === 'reviewed';
    return true;
  });

  const activeCount = alerts.filter((a) => a.review_status !== 'reviewed').length;
  const urgentCount = alerts.filter((a) => a.severity === 'urgent_safety_notice' && a.review_status !== 'reviewed').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-sm">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t('alerts.title', 'Smart Health Alert Center')}</h1>
              <p className="text-xs text-slate-500">{t('alerts.subtitle', 'Documented laboratory variances & clinical safety notices')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchAlerts}
            loading={isLoading}
          >
            {t('common.refresh', 'Refresh Alerts')}
          </Button>
        </div>
      </div>

      {/* Provenance & Safety Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-blue-950 mb-0.5">{t('alerts.policy_title', 'Transparent Provenance Standard')}</p>
          <p className="leading-relaxed">
            {t('alerts.policy_desc', 'All alerts shown here are derived directly from reference intervals printed on your official laboratory reports. MedAssist does not invent reference ranges or replace medical evaluation.')}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'all', label: t('alerts.active_tab', 'Active Alerts'), count: activeCount },
          { key: 'urgent', label: t('alerts.safety_tab', 'Safety Notices'), count: urgentCount },
          { key: 'informational', label: t('alerts.info_tab', 'Informational'), count: activeCount - urgentCount },
          { key: 'reviewed', label: t('alerts.reviewed_tab', 'Reviewed Archive'), count: alerts.filter(a => a.review_status === 'reviewed').length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              filter === tab.key
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                filter === tab.key ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          Scanning records against document reference ranges...
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No alerts in this category</p>
          <p className="text-xs text-slate-400 mt-1">All scanned values are within documented bounds or have been marked reviewed.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((a) => {
            const isUrgent = a.severity === 'urgent_safety_notice';
            const isReviewed = a.review_status === 'reviewed';

            return (
              <Card
                key={a.id}
                className={`p-5 transition-shadow border ${
                  isReviewed
                    ? 'border-slate-200 opacity-75'
                    : isUrgent
                    ? 'border-red-200 bg-red-50/20'
                    : 'border-amber-200 bg-amber-50/15'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isUrgent
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {isUrgent ? 'Urgent Safety Notice' : 'Informational Notice'}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        {a.category}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{a.reason}</p>
                  </div>

                  <div className="shrink-0">
                    <Button
                      variant={isReviewed ? 'outline' : 'secondary'}
                      size="sm"
                      onClick={() => toggleReviewStatus(a.id, a.review_status)}
                      disabled={updatingId === a.id}
                      icon={isReviewed ? RefreshCw : CheckCircle}
                      className="text-xs"
                    >
                      {isReviewed ? t('alerts.mark_active', 'Mark Active') : t('alerts.mark_reviewed', 'Mark Reviewed')}
                    </Button>
                  </div>
                </div>

                {/* Provenance and Evidence Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-slate-400 text-[10px] uppercase font-semibold">{t('alerts.recorded_value', 'Recorded Value')}</p>
                    <p className="font-bold text-slate-900 mt-0.5">{a.value}</p>
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-slate-400 text-[10px] uppercase font-semibold">{t('alerts.reference_range', 'Reference Range')}</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{a.reference_range}</p>
                  </div>

                  <div className="bg-white/80 p-2.5 rounded-lg border border-slate-200">
                    <p className="text-slate-400 text-[10px] uppercase font-semibold">{t('alerts.source_doc', 'Source Document')}</p>
                    <p className="font-medium text-slate-800 mt-0.5 flex items-center gap-1 truncate">
                      <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{a.source_document_title}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{a.source_document_date}</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
