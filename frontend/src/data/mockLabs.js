// SYNTHETIC DEMO DATA ONLY — No real patient information

export const mockLabs = {
  hemoglobin: {
    label: 'Hemoglobin',
    unit: 'g/dL',
    normalRange: { min: 13.0, max: 17.0 },
    referenceLabel: 'Normal: 13–17 g/dL (Male)',
    color: '#3b82f6',
    data: [
      { date: 'Jan 2024', value: 13.2, status: 'normal' },
      { date: 'Mar 2024', value: 13.5, status: 'normal' },
      { date: 'Jun 2024', value: 13.6, status: 'normal' },
      { date: 'Sep 2024', value: 13.8, status: 'normal' },
    ],
  },
  fastingGlucose: {
    label: 'Fasting Glucose',
    unit: 'mg/dL',
    normalRange: { min: 70, max: 100 },
    referenceLabel: 'Normal: 70–100 mg/dL',
    color: '#f59e0b',
    data: [
      { date: 'Jan 2024', value: 138, status: 'high' },
      { date: 'Mar 2024', value: 128, status: 'high' },
      { date: 'Jun 2024', value: 126, status: 'high' },
      { date: 'Sep 2024', value: 112, status: 'warning' },
    ],
  },
  hba1c: {
    label: 'HbA1c',
    unit: '%',
    normalRange: { min: 4.0, max: 5.7 },
    referenceLabel: 'Normal: <5.7% | Diabetic target: <7%',
    color: '#8b5cf6',
    data: [
      { date: 'Jan 2024', value: 7.8, status: 'high' },
      { date: 'Mar 2024', value: 7.6, status: 'high' },
      { date: 'Jun 2024', value: 7.5, status: 'high' },
      { date: 'Sep 2024', value: 7.1, status: 'warning' },
    ],
  },
  cholesterol: {
    label: 'Total Cholesterol',
    unit: 'mg/dL',
    normalRange: { min: 0, max: 200 },
    referenceLabel: 'Normal: <200 mg/dL',
    color: '#10b981',
    data: [
      { date: 'Mar 2023', value: 212, status: 'high' },
      { date: 'Sep 2023', value: 205, status: 'high' },
      { date: 'Mar 2024', value: 198, status: 'warning' },
    ],
  },
  ldl: {
    label: 'LDL Cholesterol',
    unit: 'mg/dL',
    normalRange: { min: 0, max: 100 },
    referenceLabel: 'Optimal: <100 mg/dL',
    color: '#ef4444',
    data: [
      { date: 'Mar 2023', value: 138, status: 'high' },
      { date: 'Sep 2023', value: 130, status: 'high' },
      { date: 'Mar 2024', value: 122, status: 'warning' },
    ],
  },
  bloodPressureSystolic: {
    label: 'Systolic BP',
    unit: 'mmHg',
    normalRange: { min: 90, max: 120 },
    referenceLabel: 'Normal: <120 mmHg',
    color: '#ec4899',
    data: [
      { date: 'Jan 2024', value: 134, status: 'high' },
      { date: 'Apr 2024', value: 130, status: 'high' },
      { date: 'Jun 2024', value: 132, status: 'high' },
      { date: 'Sep 2024', value: 128, status: 'warning' },
    ],
  },
};

export const labBiomarkers = [
  { key: 'hemoglobin', label: 'Hemoglobin' },
  { key: 'fastingGlucose', label: 'Fasting Glucose' },
  { key: 'hba1c', label: 'HbA1c' },
  { key: 'cholesterol', label: 'Total Cholesterol' },
  { key: 'ldl', label: 'LDL Cholesterol' },
  { key: 'bloodPressureSystolic', label: 'Systolic BP' },
];
