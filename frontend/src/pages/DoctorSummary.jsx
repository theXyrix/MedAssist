import { useState, useEffect } from 'react';
import {
  Stethoscope,
  Download,
  Sparkles,
  Calendar,
  User,
  Building,
  FileText,
  Database,
  Eye,
  Copy,
  Check,
  ClipboardList,
  AlertTriangle,
  HelpCircle,
  Plus,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import Card, { CardHeader } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { mockPatient, mockHealthMetrics } from '../data/mockPatient';
import { mockMedications, MEDICATION_STATUS } from '../data/mockMedications';
import { mockTimeline } from '../data/mockTimeline';
import { formatDateShort } from '../utils/helpers';
import {
  getDoctorSummary,
  getDoctorSummaryDownloadUrl,
  getDoctorVisitPrep,
  getDoctorVisitPrepDownloadUrl,
} from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

export default function DoctorSummary() {
  const { t } = useLanguage();
  const [summaryData, setSummaryData] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isLive, setIsLive] = useState(false);

  // Feature 5: Doctor Visit Preparation State
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [prepData, setPrepData] = useState(null);
  const [isPrepLoading, setIsPrepLoading] = useState(false);
  const [prepCopied, setPrepCopied] = useState(false);
  const [patientNotes, setPatientNotes] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [questionsList, setQuestionsList] = useState([]);

  useEffect(() => {
    let mounted = true;
    getDoctorSummary('patient-demo-001').then((res) => {
      if (mounted && res) {
        setSummaryData(res);
        setIsLive(!res.demo);
      }
    });
    return () => { mounted = false; };
  }, []);

  const handleOpenVisitPrep = async () => {
    setShowPrepModal(true);
    setIsPrepLoading(true);
    try {
      const data = await getDoctorVisitPrep('patient-demo-001');
      if (data) {
        setPrepData(data);
        setQuestionsList(data.suggested_questions || []);
      }
    } catch (err) {
      console.error('Failed to load doctor visit prep:', err);
    } finally {
      setIsPrepLoading(false);
    }
  };

  const handleAddQuestion = () => {
    if (customQuestion.trim()) {
      setQuestionsList((prev) => [...prev, customQuestion.trim()]);
      setCustomQuestion('');
    }
  };

  const handleRemoveQuestion = (idx) => {
    setQuestionsList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCopyVisitPrep = () => {
    if (!prepData) return;
    const finalBrief = `${prepData.brief_markdown}\n\n## 7. Patient Personal Notes & Symptoms to Discuss\n${patientNotes ? `- ${patientNotes}` : '- No additional personal notes added.'}\n\n## 8. Final Questions for Consultation\n${questionsList.map(q => `- [ ] ${q}`).join('\n')}`;

    navigator.clipboard.writeText(finalBrief);
    setPrepCopied(true);
    setTimeout(() => setPrepCopied(false), 3000);
  };

  const handleDownloadVisitPrep = () => {
    window.open(getDoctorVisitPrepDownloadUrl('patient-demo-001'), '_blank');
  };

  const activeMeds = summaryData?.current_medications || mockMedications.filter(m => m.status === MEDICATION_STATUS.ACTIVE || m.status === 'active');
  const recentVisits = mockTimeline.filter(e => e.type === 'visit').slice(0, 3);
  const narrative = summaryData?.generated_narrative || (
    "Arjun Sharma is a 42-year-old male with Type 2 Diabetes Mellitus (managed) and mild Essential Hypertension. " +
    "HbA1c has improved from 7.8% to 7.1% over the past 9 months, indicating positive glycemic control. " +
    "Currently on Metformin 500mg BD, Amlodipine 5mg OD, Aspirin 75mg ON, and Vitamin D3 60,000 IU weekly."
  );

  const patient = summaryData?.patient || mockPatient;
  const recentObs = summaryData?.recent_observations || [];
  const exportText = summaryData?.export_markdown || '';

  const handleDownload = () => {
    window.open(getDoctorSummaryDownloadUrl('patient-demo-001'), '_blank');
  };

  const handleCopy = () => {
    if (exportText) {
      navigator.clipboard.writeText(exportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{t('doctor.title', 'Doctor Summary')}</h2>
            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${isLive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              <Database className="w-3 h-3" />
              {isLive ? t('common.live_data', 'Live Supabase Data') : t('common.demo_fallback', 'Demo Fallback')}
            </span>
          </div>
          <p className="text-sm text-slate-500">{t('doctor.subtitle', 'Physician-ready clinical summary grounded in verified records')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Feature 5: Prepare for Doctor Visit Button */}
          <Button
            variant="primary"
            size="sm"
            icon={ClipboardList}
            onClick={handleOpenVisitPrep}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm"
          >
            {t('doctor.prepare_btn', 'Prepare for Visit')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Eye}
            onClick={() => setShowReviewModal(true)}
          >
            {t('doctor.review_export', 'Review & Export')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={Download}
            onClick={handleDownload}
          >
            {t('common.download', 'Download')}
          </Button>
        </div>
      </div>

      {/* FEATURE 5: DOCTOR VISIT PREPARATION MODAL */}
      {showPrepModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowPrepModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <ClipboardList className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{t('doctor.prep_title', 'Doctor Visit Preparation Brief')}</h3>
                  <p className="text-xs text-slate-500">{t('doctor.prep_subtitle', 'Comprehensive appointment agenda grounded in stored records')}</p>
                </div>
              </div>
              <button
                onClick={() => setShowPrepModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 font-bold"
              >✕</button>
            </div>

            {isPrepLoading ? (
              <div className="py-16 text-center text-slate-500 text-sm">
                <Sparkles className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                Assembling appointment brief, lab changes, and clinical questions...
              </div>
            ) : prepData ? (
              <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
                {/* Medical Safety Banner */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-blue-900 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    {t('doctor.prep_banner', 'This brief organizes your active medical records, recent lab changes, and unanswered document questions. Review and adjust your questions below.')}
                  </p>
                </div>

                {/* Section: Medical History & Active Diagnoses */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wide text-[11px]">
                    {t('doctor.diagnoses_title', '1. Active Diagnoses & History')}
                  </h4>
                  <div className="space-y-1 text-slate-700">
                    {prepData.conditions?.length > 0 ? (
                      prepData.conditions.map((c, i) => (
                        <p key={i}>• <strong>{c.name}</strong> (Diagnosed: {c.diagnosed_date || 'Documented'})</p>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">No formal chronic conditions documented.</p>
                    )}
                  </div>
                </div>

                {/* Section: Current Medications & Allergies */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wide text-[11px]">
                      {t('doctor.meds_title', '2. Active Medications')}
                    </h4>
                    <div className="space-y-1.5 text-slate-700">
                      {prepData.medications?.map((m, i) => (
                        <p key={i}>• <strong>{m.name}</strong> {m.dosage} ({m.frequency})</p>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wide text-[11px]">
                      {t('doctor.allergies_title', '3. Documented Allergies')}
                    </h4>
                    <div className="space-y-1.5 text-slate-700">
                      {prepData.allergies?.length > 0 ? (
                        prepData.allergies.map((a, i) => (
                          <p key={i} className="text-red-700 font-medium">⚠️ {typeof a === 'object' ? a.substance : a}</p>
                        ))
                      ) : (
                        <p className="text-slate-400 italic">No drug allergies formally recorded.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section: Recent Observations & Changes */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wide text-[11px]">
                    {t('doctor.obs_title', '4. Recent Clinical Observations')}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {prepData.recent_observations?.slice(0, 6).map((o, i) => (
                      <div key={i} className="bg-white p-2 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-400 block truncate">{o.test_name}</span>
                        <span className="font-bold text-slate-900">{o.value_numeric || o.value} {o.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: Unresolved Record Inconsistencies */}
                {prepData.unresolved_conflicts?.length > 0 && (
                  <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-950">
                    <h4 className="font-bold mb-1.5 uppercase tracking-wide text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      {t('doctor.conflicts_title', '5. Inconsistencies to Clarify with Doctor')}
                    </h4>
                    {prepData.unresolved_conflicts.map((uc, i) => (
                      <p key={i} className="text-xs mb-1">
                        • <strong>{uc.title}:</strong> {uc.explanation}
                      </p>
                    ))}
                  </div>
                )}

                {/* Section: Undocumented / Missing Health Information */}
                {prepData.missing_information?.length > 0 && (
                  <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-slate-700">
                    <h4 className="font-bold mb-1 uppercase tracking-wide text-[11px] text-slate-800">
                      {t('doctor.missing_title', '6. Missing / Undocumented Records Notice')}
                    </h4>
                    {prepData.missing_information.map((m, i) => (
                      <p key={i} className="text-slate-600">• {m}</p>
                    ))}
                  </div>
                )}

                {/* Section: Interactive Suggested Questions */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-2 uppercase tracking-wide text-[11px]">
                    {t('doctor.questions_title', '7. Questions to Ask Your Physician')}
                  </h4>
                  <div className="space-y-2 mb-3">
                    {questionsList.map((q, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <span className="text-slate-800">{q}</span>
                        <button
                          onClick={() => handleRemoveQuestion(idx)}
                          className="text-slate-400 hover:text-red-600 p-1"
                          title="Remove question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Question */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
                      placeholder="Add another question for your doctor..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800"
                    />
                    <Button variant="outline" size="sm" icon={Plus} onClick={handleAddQuestion}>
                      {t('doctor.add_question', 'Add')}
                    </Button>
                  </div>
                </div>

                {/* Section: Editable Patient Personal Notes */}
                <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 mb-1.5 uppercase tracking-wide text-[11px]">
                    {t('doctor.notes_title', '8. Your Personal Notes & Symptoms')}
                  </h4>
                  <textarea
                    rows={2}
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    placeholder="Type any symptoms, energy levels, or questions you wish to mention during the appointment..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ) : null}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                icon={prepCopied ? Check : Copy}
                onClick={handleCopyVisitPrep}
                className="text-xs"
              >
                {prepCopied ? 'Brief Copied!' : t('doctor.copy_brief', 'Copy Appointment Brief')}
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowPrepModal(false)}>
                  {t('common.close', 'Close')}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Download}
                  onClick={handleDownloadVisitPrep}
                  className="text-xs"
                >
                  {t('doctor.download_brief', 'Download Brief (.md)')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Review Summary Before Sharing</h3>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 font-bold"
              >✕</button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Review all details before exporting or handing to your healthcare provider.
            </p>

            <div className="mt-3 flex-1 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap">
              {exportText || narrative}
            </div>

            <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                icon={copied ? Check : Copy}
                onClick={handleCopy}
              >
                {copied ? 'Copied to Clipboard!' : 'Copy Formatted Text'}
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowReviewModal(false)}>Close</Button>
                <Button variant="primary" size="sm" icon={Download} onClick={handleDownload}>Download File</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient header card */}
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {patient.name?.charAt(0) || 'A'}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{patient.name || 'Arjun Sharma'}</h3>
              <p className="text-xs text-slate-500">
                {patient.age || '42'} yrs · {patient.gender || 'Male'} · Blood: <span className="font-semibold text-slate-700">{patient.blood_group || 'B+'}</span> · ID: <span className="font-mono">{patient.id || 'patient-demo-001'}</span>
              </p>
            </div>
          </div>
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2.5 py-1 rounded-full">
            Active Patient
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400">Primary Care</span>
            <p className="font-semibold text-slate-800 mt-0.5">Dr. Meena Patel</p>
          </div>
          <div>
            <span className="text-slate-400">Hospital</span>
            <p className="font-semibold text-slate-800 mt-0.5">Apollo Hospitals</p>
          </div>
          <div>
            <span className="text-slate-400">Emergency Contact</span>
            <p className="font-semibold text-slate-800 mt-0.5">+91 98765 43210</p>
          </div>
          <div>
            <span className="text-slate-400">Report Date</span>
            <p className="font-semibold text-slate-800 mt-0.5">October 2026</p>
          </div>
        </div>
      </Card>

      {/* AI Narrative Summary */}
      <Card>
        <CardHeader
          title="Clinical Narrative"
          subtitle="AI synthesized from verified uploaded records"
          action={
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Verified Summary
            </span>
          }
        />
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 text-sm text-slate-700 leading-relaxed font-sans">
          {narrative}
        </div>
      </Card>

      {/* Active Diagnoses / Conditions */}
      <Card>
        <CardHeader title="Chronic & Active Diagnoses" subtitle="ICD-10 aligned" />
        <div className="space-y-2">
          {mockPatient.primaryConditions.map((condition, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-slate-800">{condition}</span>
              </div>
              <span className="text-xs text-slate-400">Managed</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Current Medications */}
      <Card>
        <CardHeader
          title="Current Medications"
          subtitle={`${activeMeds.length} active prescriptions on record`}
        />
        <div className="space-y-2">
          {activeMeds.map((med) => (
            <div key={med.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
              <div>
                <p className="font-semibold text-slate-900">{med.name} {med.dosage}</p>
                <p className="text-xs text-slate-400 mt-0.5">{med.frequency} · {med.purpose || 'Maintenance'}</p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Observations */}
      <Card>
        <CardHeader title="Key Clinical Measurements" subtitle="Recent laboratory extractions" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {recentObs.length > 0 ? (
            recentObs.map((obs, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500 font-medium truncate">{obs.test_name}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {obs.value_numeric || obs.value} <span className="text-xs font-normal text-slate-400">{obs.unit}</span>
                </p>
                <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${
                  obs.status === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                  obs.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {obs.status || 'normal'}
                </span>
              </div>
            ))
          ) : (
            mockHealthMetrics.map((metric) => (
              <div key={metric.label} className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500 font-medium">{metric.label}</p>
                <p className="text-lg font-bold text-slate-900 mt-1">
                  {metric.value} <span className="text-xs font-normal text-slate-400">{metric.unit}</span>
                </p>
                <span className={`inline-block mt-1 text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${
                  metric.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {metric.status === 'warning' ? 'Borderline' : 'Normal'}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
        ⚕️ <strong>Physician Notice:</strong> This document aggregates extracted clinical records for healthcare provider reference. It does not replace comprehensive medical judgment.
      </div>
    </div>
  );
}
