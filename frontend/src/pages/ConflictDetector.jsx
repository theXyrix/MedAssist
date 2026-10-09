import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  GitCompare,
  CheckCircle2,
  Clock,
  FileText,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  Check,
  ChevronRight,
  Database,
  ArrowRight,
} from 'lucide-react';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { getConflicts, updateConflictStatus } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

export default function ConflictDetector() {
  const { t } = useLanguage();
  const [conflicts, setConflicts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unreviewed | reviewed | resolved
  const [updatingId, setUpdatingId] = useState(null);
  const [notes, setNotes] = useState({});

  const fetchConflicts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getConflicts('patient-demo-001');
      setConflicts(data || []);
    } catch (err) {
      console.error('Failed to load conflicts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConflicts();
  }, [fetchConflicts]);

  const handleStatusChange = async (conflictId, newStatus) => {
    setUpdatingId(conflictId);
    const userNote = notes[conflictId] || '';
    try {
      await updateConflictStatus(conflictId, newStatus, userNote);
      setConflicts((prev) =>
        prev.map((c) =>
          c.id === conflictId ? { ...c, status: newStatus, user_note: userNote } : c
        )
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredConflicts = conflicts.filter((c) => {
    if (filter === 'all') return true;
    return c.status.toLowerCase() === filter.toLowerCase();
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-sm">
              <GitCompare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{t('conflict.title', 'Medical Record Conflict Detector')}</h1>
              <p className="text-xs text-slate-500">{t('conflict.subtitle', 'Cross-document clinical consistency and dosage verification')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchConflicts}
            loading={isLoading}
          >
            {t('common.re_scan', 'Re-scan Records')}
          </Button>
        </div>
      </div>

      {/* Safety Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-amber-950 mb-0.5">{t('conflict.policy_title', 'Clinical Safety & Non-Interference Policy')}</p>
          <p className="leading-relaxed">
            {t('conflict.policy_desc', 'MedAssist highlights variances across dated documents to assist clinical discussion. MedAssist never decides which prescription instruction is correct and never automatically modifies patient records.')}
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {[
          { key: 'all', label: t('conflict.all_records', 'All Records'), count: conflicts.length },
          { key: 'unreviewed', label: t('common.unreviewed', 'Unreviewed'), count: conflicts.filter(c => c.status === 'Unreviewed').length },
          { key: 'reviewed', label: t('common.reviewed', 'Reviewed'), count: conflicts.filter(c => c.status === 'Reviewed').length },
          { key: 'resolved', label: t('common.resolved', 'Resolved'), count: conflicts.filter(c => c.status === 'Resolved').length },
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

      {/* Conflicts List */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
          Comparing cross-document records...
        </div>
      ) : filteredConflicts.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-800">No conflicts in this category</p>
          <p className="text-xs text-slate-400 mt-1">All scanned cross-document items are aligned or marked resolved.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredConflicts.map((c) => {
            const isChronological = c.conflict_type === 'Chronological Progression';
            const isCritical = c.severity === 'critical';

            return (
              <Card key={c.id} className="p-5 border-slate-200 hover:border-slate-300 transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          isCritical
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : isChronological
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {c.conflict_type}
                      </span>

                      <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                        {c.category}
                      </span>

                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          c.status === 'Resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'Reviewed'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{c.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{c.explanation}</p>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant={c.status === 'Unreviewed' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(c.id, 'Unreviewed')}
                      disabled={updatingId === c.id}
                      className="text-xs"
                    >
                      {t('common.unreviewed', 'Unreviewed')}
                    </Button>
                    <Button
                      variant={c.status === 'Reviewed' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(c.id, 'Reviewed')}
                      disabled={updatingId === c.id}
                      className="text-xs"
                    >
                      {t('common.reviewed', 'Reviewed')}
                    </Button>
                    <Button
                      variant={c.status === 'Resolved' ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(c.id, 'Resolved')}
                      disabled={updatingId === c.id}
                      className="text-xs"
                    >
                      {t('common.resolved', 'Resolved')}
                    </Button>
                  </div>
                </div>

                {/* Compared Records Grid */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    {t('conflict.evidence_label', 'Evidence From Source Documents')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {c.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                            <span className="flex items-center gap-1 font-medium">
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              {item.source_document_title}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.date || item.source_document_date || 'Undated'}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-slate-900 mt-1">
                            {item.dosage ? `${item.dosage} — ${item.frequency}` : item.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Guidance Footer */}
                <div className="mt-3 flex items-start gap-2 bg-blue-50/60 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-900">
                  <HelpCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">{t('conflict.physician_action', 'Recommended Physician Action')}: </span>
                    {c.guidance}
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
