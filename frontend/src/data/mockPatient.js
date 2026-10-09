// SYNTHETIC DEMO DATA ONLY — No real patient information

export const mockPatient = {
  id: 'patient-demo-001',
  name: 'Arjun Sharma',
  age: 42,
  dob: '1982-03-15',
  gender: 'Male',
  bloodType: 'B+',
  allergies: ['Penicillin', 'Sulfa drugs'],
  primaryConditions: ['Type 2 Diabetes (managed)', 'Mild Hypertension'],
  emergencyContact: {
    name: 'Priya Sharma',
    relation: 'Spouse',
    phone: '+91 98765 43210',
  },
  insurance: {
    provider: 'Star Health Insurance',
    policyNumber: 'SHI-DEMO-2024-001',
  },
  primaryPhysician: {
    name: 'Dr. Meena Patel',
    specialty: 'Internal Medicine',
    hospital: 'Apollo Hospitals',
    phone: '+91 80 4112 3456',
  },
  lastUpdated: '2024-10-01',
  avatar: null,
  height: '175 cm',
  weight: '78 kg',
  bmi: 25.5,
};

export const mockHealthMetrics = [
  {
    id: 'hm-001',
    label: 'Blood Pressure',
    value: '128/84',
    unit: 'mmHg',
    status: 'warning',
    trend: 'stable',
    icon: 'heart',
    lastChecked: '2024-09-28',
  },
  {
    id: 'hm-002',
    label: 'Fasting Glucose',
    value: '112',
    unit: 'mg/dL',
    status: 'warning',
    trend: 'improving',
    icon: 'droplet',
    lastChecked: '2024-09-28',
  },
  {
    id: 'hm-003',
    label: 'Hemoglobin',
    value: '13.8',
    unit: 'g/dL',
    status: 'normal',
    trend: 'stable',
    icon: 'activity',
    lastChecked: '2024-09-15',
  },
  {
    id: 'hm-004',
    label: 'HbA1c',
    value: '7.1',
    unit: '%',
    status: 'warning',
    trend: 'improving',
    icon: 'percent',
    lastChecked: '2024-08-20',
  },
];

export const mockAIInsights = [
  {
    id: 'ai-001',
    type: 'observation',
    message: 'Your HbA1c has improved from 7.8% to 7.1% over the last 6 months — great progress with glycemic control.',
    timestamp: '2024-10-01',
  },
  {
    id: 'ai-002',
    type: 'alert',
    message: 'Blood pressure readings have been slightly above optimal range. Consider discussing lifestyle modifications with Dr. Patel.',
    timestamp: '2024-09-28',
  },
  {
    id: 'ai-003',
    type: 'reminder',
    message: 'Your annual lipid panel is due. Last recorded cholesterol was 198 mg/dL (Sep 2023).',
    timestamp: '2024-09-15',
  },
];
