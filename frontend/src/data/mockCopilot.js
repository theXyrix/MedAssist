// SYNTHETIC DEMO DATA ONLY — No real patient information

export const mockCopilotResponses = {
  'latest blood test': {
    response: `Based on your **September 2024 lab reports**, here are your latest results:

**Complete Blood Count:**
- Hemoglobin: **13.8 g/dL** (Normal range: 13–17 g/dL) ✅
- WBC: 7,200 /µL (Normal) ✅
- Platelets: 2,45,000 /µL (Normal) ✅

**Diabetes Panel:**
- HbA1c: **7.1%** (Improved from 7.8% in January 2024) 📈
- Fasting Glucose: **112 mg/dL** (Slightly above normal; target <100) ⚠️

**Overall:** Your blood tests show a positive trend, especially your HbA1c improvement over the past year.

---
⚠️ *MedAssist provides information based on your uploaded records. Always consult Dr. Meena Patel for medical advice.*`,
    sources: ['CBC - September 2024', 'HbA1c Report - September 2024'],
    timestamp: '2024-10-01T10:00:00',
  },
  'hemoglobin history': {
    response: `Here is your **Hemoglobin trend** over the past year:

| Date | Value | Status |
|------|-------|--------|
| January 2024 | 13.2 g/dL | ✅ Normal |
| March 2024 | 13.5 g/dL | ✅ Normal |
| June 2024 | 13.6 g/dL | ✅ Normal |
| September 2024 | **13.8 g/dL** | ✅ Normal |

**Trend: Gradually improving** 📈

Your hemoglobin has been consistently within the normal range (13–17 g/dL for males) and shows a slight upward trend.

---
⚠️ *This is for informational purposes only.*`,
    sources: ['Multiple lab reports (Jan–Sep 2024)'],
    timestamp: '2024-10-01T10:05:00',
  },
  'last two reports': {
    response: `**Comparing your last two visits (January vs September 2024):**

| Biomarker | Jan 2024 | Sep 2024 | Change |
|-----------|----------|----------|--------|
| HbA1c | 7.8% | **7.1%** | ↓ Improved ✅ |
| Fasting Glucose | 138 mg/dL | **112 mg/dL** | ↓ Improved ✅ |
| Hemoglobin | 13.2 g/dL | **13.8 g/dL** | ↑ Improved ✅ |
| Blood Pressure | 134/88 | **128/84** | ↓ Improved ✅ |

**Summary:** Significant improvement across all major biomarkers over the 9-month period.

---
⚠️ *Always verify with your physician.*`,
    sources: ['Annual Physical - Jan 2024', 'Follow-up - Sep 2024'],
    timestamp: '2024-10-01T10:10:00',
  },
  'hospital visit': {
    response: `**Summary of your latest hospital visit (September 28, 2024):**

**Facility:** Apollo Hospitals, Bangalore
**Physician:** Dr. Meena Patel (Internal Medicine)
**Visit Type:** Quarterly follow-up

**Key Findings:**
- Blood pressure: 128/84 mmHg (slightly elevated)
- Weight: 78 kg (stable)
- HbA1c improved to 7.1% from 7.8%

**Medications Adjusted:**
- Metformin 500mg continued
- Amlodipine 5mg added for BP management

**Next Steps:**
- Follow-up in 3 months
- Monitor blood pressure weekly at home
- Maintain low-carb diet

---
⚠️ *This is a summary from your uploaded records.*`,
    sources: ['Consultation Note - Sep 2024', 'Prescription - Sep 2024'],
    timestamp: '2024-10-01T10:15:00',
  },
};

export const mockCopilotSuggestions = [
  "What were my latest blood test results?",
  "Show my hemoglobin history.",
  "What changed between my last two reports?",
  "Summarize my latest hospital visit.",
  "What medications am I currently taking?",
  "Is my diabetes under control?",
  "When is my next medication refill due?",
  "Show my blood pressure trend.",
];

export const getAIResponse = (query) => {
  const q = query.toLowerCase();
  if (q.includes('blood test') || q.includes('lab result')) return mockCopilotResponses['latest blood test'];
  if (q.includes('hemoglobin')) return mockCopilotResponses['hemoglobin history'];
  if (q.includes('two report') || q.includes('last two') || q.includes('compare')) return mockCopilotResponses['last two reports'];
  if (q.includes('hospital') || q.includes('visit') || q.includes('summary')) return mockCopilotResponses['hospital visit'];

  return {
    response: `I found information related to your query. Based on your uploaded medical records:

Your most recent records are from **September 2024**. You have **7 documents** uploaded, including lab reports, prescriptions, and consultation notes.

For specific health questions, try asking about:
- "What were my latest blood test results?"
- "Show my hemoglobin trend"
- "What medications am I taking?"

---
⚠️ *MedAssist provides information and organization based on uploaded records. It does not diagnose conditions or replace professional medical advice.*`,
    sources: ['All uploaded documents'],
    timestamp: new Date().toISOString(),
  };
};
