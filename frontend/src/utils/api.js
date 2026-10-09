/**
 * MedAssist Frontend API Client
 * Connects React UI to FastAPI backend with JWT authorization and mock fallbacks.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

let currentAuthToken = null;

export function setAuthToken(token) {
  currentAuthToken = token;
}

export function getAuthToken() {
  return currentAuthToken;
}

function getAuthHeaders() {
  const headers = {
    'Accept': 'application/json',
  };
  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }
  return headers;
}

async function safeFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API returned HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn(`[MedAssist API] Call to ${endpoint} failed, using local fallback:`, err.message);
    return null;
  }
}

// ── Auth Endpoints ──────────────────────────────────────────────────────────

export async function loginApi(email, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[MedAssist API] Login error:', err);
    return { detail: err.message };
  }
}

export async function signupApi(name, email, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[MedAssist API] Signup error:', err);
    return { detail: err.message };
  }
}

export async function demoLoginApi() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@medassist.ai', name: 'Demo Patient' }),
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('[MedAssist API] Demo login error:', err);
    return null;
  }
}

export async function getMeApi() {
  return await safeFetch('/api/auth/me');
}

// ── Core Health Endpoints ───────────────────────────────────────────────────

export async function getPatient(patientId = 'patient-demo-001') {
  const data = await safeFetch(`/api/patients/${patientId}`);
  return data?.data || null;
}

export async function getDocuments(patientId = 'patient-demo-001') {
  const data = await safeFetch(`/api/documents?patient_id=${patientId}`);
  return data?.data?.documents || null;
}

export async function uploadDocument(formData) {
  try {
    const headers = {};
    if (currentAuthToken) {
      headers['Authorization'] = `Bearer ${currentAuthToken}`;
    }
    const res = await fetch(`${API_BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers,
      body: formData, // FormData contains file, patient_id, document_type, title
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.detail || `Upload failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[MedAssist API] Upload error:', err);
    throw err;
  }
}

export async function getMedications(patientId = 'patient-demo-001') {
  const data = await safeFetch(`/api/medications?patient_id=${patientId}`);
  return data?.data?.medications || null;
}

export async function getTimeline(patientId = 'patient-demo-001') {
  const data = await safeFetch(`/api/timeline?patient_id=${patientId}`);
  return data?.data?.events || null;
}

export async function getObservations(patientId = 'patient-demo-001', testName = null) {
  const query = testName ? `&test_name=${encodeURIComponent(testName)}` : '';
  const data = await safeFetch(`/api/observations?patient_id=${patientId}${query}`);
  return data?.data?.observations || null;
}

export async function askCopilot(question, patientId = 'patient-demo-001', language = 'en') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/copilot/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ question, patient_id: patientId, language }),
    });
    if (!res.ok) {
      throw new Error(`Copilot HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    console.warn('[MedAssist API] Copilot fallback:', err.message);
    return null;
  }
}

export async function getDoctorSummary(patientId = 'patient-demo-001') {
  const data = await safeFetch(`/api/doctor-summary?patient_id=${patientId}`);
  return data?.data || null;
}

export async function getEmergencyCard(patientId = 'patient-demo-001') {
  const data = await safeFetch(`/api/emergency-card?patient_id=${patientId}`);
  return data?.data || null;
}

export async function getDocumentDownloadUrl(documentId) {
  const data = await safeFetch(`/api/documents/${documentId}/download`);
  return data || null;
}

export async function getAIHealthSummary(patientId = 'patient-demo-001', language = 'en') {
  const data = await safeFetch(`/api/health-summary?patient_id=${patientId}&language=${language}`);
  return data?.data || null;
}

export function getDoctorSummaryDownloadUrl(patientId = 'patient-demo-001') {
  return `${API_BASE_URL}/api/doctor-summary/download?patient_id=${patientId}`;
}

export async function getFhirBundle(patientId = 'patient-demo-001') {
  const data = await safeFetch(`/api/fhir/Bundle?patient_id=${patientId}`);
  return data || null;
}

// ── Advanced Health Intelligence APIs ────────────────────────────────────────

export async function getConflicts(patientId = 'patient-demo-001') {
  const data = await safeFetch(`/api/conflicts?patient_id=${patientId}`);
  return data?.data?.conflicts || [];
}

export async function updateConflictStatus(conflictId, status, note = '') {
  try {
    const res = await fetch(`${API_BASE_URL}/api/conflicts/${conflictId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status, note }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[MedAssist API] updateConflictStatus error:', err);
    return null;
  }
}

export async function getHealthChanges(patientId = 'patient-demo-001', language = 'en') {
  const data = await safeFetch(`/api/observations/changes?patient_id=${patientId}&language=${language}`);
  return data?.data || null;
}

export async function getSmartAlerts(patientId = 'patient-demo-001') {
  const data = await safeFetch(`/api/alerts?patient_id=${patientId}`);
  return data?.data?.alerts || [];
}

export async function updateAlertStatus(alertId, status) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/alerts/${alertId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err) {
    console.warn('[MedAssist API] updateAlertStatus error:', err);
    return null;
  }
}

export async function getDoctorVisitPrep(patientId = 'patient-demo-001', language = 'en') {
  const data = await safeFetch(`/api/doctor-visit-prep?patient_id=${patientId}&language=${language}`);
  return data?.data || null;
}

export function getDoctorVisitPrepDownloadUrl(patientId = 'patient-demo-001', language = 'en') {
  return `${API_BASE_URL}/api/doctor-visit-prep/download?patient_id=${patientId}&language=${language}`;
}
