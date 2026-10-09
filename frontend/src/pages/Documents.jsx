import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Upload, Filter, FileText, Eye, MoreVertical,
  CheckCircle, Clock, AlertCircle, RefreshCw, Download, Database
} from 'lucide-react';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { EmptyState, StatusIndicator, LoadingSpinner } from '../components/ui/Loading';
import { mockDocuments, DOCUMENT_TYPES, PROCESSING_STATUS } from '../data/mockDocuments';
import { formatDateShort, getStatusColor } from '../utils/helpers';
import { getDocuments, getDocumentDownloadUrl } from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

const STATUS_CONFIG = {
  [PROCESSING_STATUS.COMPLETED]: { label: 'Completed', icon: CheckCircle, color: 'success' },
  [PROCESSING_STATUS.PROCESSING]: { label: 'Processing', icon: RefreshCw, color: 'primary' },
  [PROCESSING_STATUS.PENDING]: { label: 'Pending', icon: Clock, color: 'warning' },
  [PROCESSING_STATUS.FAILED]: { label: 'Failed', icon: AlertCircle, color: 'danger' },
  processed: { label: 'Processed', icon: CheckCircle, color: 'success' },
};

const TYPE_COLORS = {
  [DOCUMENT_TYPES.LAB_REPORT]: 'bg-violet-50 text-violet-700 border-violet-200',
  [DOCUMENT_TYPES.PRESCRIPTION]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [DOCUMENT_TYPES.DISCHARGE_SUMMARY]: 'bg-blue-50 text-blue-700 border-blue-200',
  [DOCUMENT_TYPES.IMAGING]: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  [DOCUMENT_TYPES.CONSULTATION]: 'bg-amber-50 text-amber-700 border-amber-200',
  [DOCUMENT_TYPES.VACCINATION]: 'bg-pink-50 text-pink-700 border-pink-200',
  lab_report: 'bg-violet-50 text-violet-700 border-violet-200',
  prescription: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  discharge_summary: 'bg-blue-50 text-blue-700 border-blue-200',
  other: 'bg-slate-50 text-slate-700 border-slate-200',
};

export default function Documents() {
  const { t } = useLanguage();
  const [documentsList, setDocumentsList] = useState(mockDocuments);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchDocs = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiDocs = await getDocuments('patient-demo-001');
      if (apiDocs && apiDocs.length > 0) {
        const mapped = apiDocs.map((d) => ({
          id: d.id,
          name: d.title || d.file_name || 'Medical Document',
          type: d.document_type || 'other',
          date: d.document_date || d.created_at?.slice(0, 10),
          doctor: d.source || 'Apollo Hospitals',
          status: d.processing_status || 'completed',
          fileSize: d.file_size_bytes ? `${(d.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : '1.2 MB',
          summary: d.ai_summary || d.extracted_text || 'Processed medical record.',
          tags: d.tags || ['Verified'],
          hasStorage: Boolean(d.storage_path),
        }));
        setDocumentsList(mapped);
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
    fetchDocs();
  }, [fetchDocs]);

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      const res = await getDocumentDownloadUrl(doc.id);
      if (res?.download_url) {
        window.open(res.download_url, '_blank');
      } else {
        setToastMsg(`Demo file: No physical file exists for "${doc.name}" in private storage.`);
        setTimeout(() => setToastMsg(null), 4000);
      }
    } catch (err) {
      setToastMsg('Failed to generate download URL. Please try again.');
      setTimeout(() => setToastMsg(null), 4000);
    } finally {
      setDownloadingId(null);
    }
  };

  const typeOptions = ['All', ...Object.values(DOCUMENT_TYPES)];
  const statusOptions = ['All', 'Completed', 'Processed', 'Processing', 'Pending', 'Failed'];

  const filtered = documentsList.filter((doc) => {
    const matchSearch = (doc.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (doc.doctor || '').toLowerCase().includes(search.toLowerCase()) ||
      (doc.tags || []).some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchType = filterType === 'All' || doc.type === filterType;
    const matchStatus = filterStatus === 'All' || (doc.status || '').toLowerCase() === filterStatus.toLowerCase();
    return matchSearch && matchType && matchStatus;
  });

  const totalCount = documentsList.length;
  const processedCount = documentsList.filter(d => d.status === PROCESSING_STATUS.COMPLETED || d.status === 'processed').length;
  const processingCount = documentsList.filter(d => d.status === PROCESSING_STATUS.PROCESSING || d.status === 'processing').length;
  const labReportsCount = documentsList.filter(d => d.type === DOCUMENT_TYPES.LAB_REPORT || d.type === 'lab_report').length;

  return (
    <div className="space-y-5">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between animate-fade-in">
          <span>ℹ️ {toastMsg}</span>
          <button onClick={() => setToastMsg(null)} className="text-amber-600 hover:text-amber-800 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{t('docs.title', 'Medical Documents')}</h2>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <Database className="w-3 h-3" />
              {isLive ? t('common.live_data', 'Live Supabase Data') : t('common.demo_fallback', 'Demo Fallback')}
            </span>
          </div>
          <p className="text-sm text-slate-500">{t('docs.subtitle', `${documentsList.length} documents stored`)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={RefreshCw}
            size="sm"
            onClick={fetchDocs}
            disabled={isLoading}
            className={isLoading ? 'animate-spin' : ''}
          >
            {t('common.refresh', 'Refresh')}
          </Button>
          <Link to="/documents/upload">
            <Button variant="gradient" icon={Upload}>{t('docs.upload_btn', 'Upload Document')}</Button>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: totalCount, color: 'text-slate-700' },
          { label: 'Processed', value: processedCount, color: 'text-emerald-600' },
          { label: 'Processing', value: processingCount, color: 'text-blue-600' },
          { label: 'Lab Reports', value: labReportsCount, color: 'text-violet-600' },
        ].map((stat) => (
          <Card key={stat.label} className="text-center py-3" padding={false}>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
          </Card>
        ))}
      </div>


      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, doctor, or tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-300 focus:bg-white transition-all"
            />
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            aria-label="Filter by document type"
          >
            {typeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
            aria-label="Filter by status"
          >
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Document list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Try adjusting your search or filter, or upload a new document."
          action={
            <Link to="/documents/upload">
              <Button variant="primary" icon={Upload}>Upload Document</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG[PROCESSING_STATUS.PENDING];
            const StatusIcon = statusCfg.icon;

            return (
              <Card key={doc.id} hover padding={false} className="p-4">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">{doc.name}</h3>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLORS[doc.type] || ''}`}>
                        {doc.type}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span>{formatDateShort(doc.date)}</span>
                      {doc.doctor && <span>• {doc.doctor}</span>}
                      <span>• {doc.fileType} • {doc.fileSize}</span>
                    </div>

                    {doc.summary && (
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed line-clamp-2">{doc.summary}</p>
                    )}

                    {/* Tags */}
                    {doc.tags && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {doc.tags.map((tag) => (
                          <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status + Actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <StatusIndicator status={doc.status} label={statusCfg.label} />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        aria-label={`Preview ${doc.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingId === doc.id}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                        aria-label={`Download ${doc.name}`}
                        title="Download Document"
                      >
                        <Download className={`w-4 h-4 ${downloadingId === doc.id ? 'animate-bounce text-blue-600' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview modal */}
      {previewDoc && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-bounce-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-900">{previewDoc.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{previewDoc.type} • {formatDateShort(previewDoc.date)}</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                aria-label="Close preview"
              >✕</button>
            </div>

            {previewDoc.summary && (
              <div className="p-4 bg-slate-50 rounded-xl mb-4">
                <p className="text-sm font-medium text-slate-700 mb-1">AI Summary</p>
                <p className="text-sm text-slate-600">{previewDoc.summary}</p>
              </div>
            )}

            {previewDoc.extractedValues && (
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-slate-700">Extracted Values</p>
                {Object.entries(previewDoc.extractedValues).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-sm border-b border-slate-100 pb-1.5">
                    <span className="text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-medium text-slate-900">{val}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={() => handleDownload(previewDoc)}
                disabled={downloadingId === previewDoc.id}
              >
                {downloadingId === previewDoc.id ? 'Generating Link...' : 'Download File'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewDoc(null)}
              >
                Close
              </Button>
            </div>

            <p className="text-[11px] text-slate-400 mt-3 italic">
              ⚕️ Extracted values are for reference only. Consult your physician for medical interpretation.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
