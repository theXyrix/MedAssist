import { Lock, Shield, Eye, Database, Download, Trash2 } from 'lucide-react';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useLanguage } from '../context/LanguageContext';

export default function Privacy() {
  const { t } = useLanguage();
  const sections = [
    {
      icon: Shield,
      title: 'Data Protection',
      content: 'MedAssist is a prototype application. All medical data shown is synthetic/demo data only. No real patient records are stored or processed. In a production environment, all data would be encrypted at rest and in transit using industry-standard AES-256 encryption.',
    },
    {
      icon: Eye,
      title: 'Data Visibility',
      content: 'Your health records are accessible only to you. MedAssist does not share your data with third parties, advertisers, or pharmaceutical companies. AI processing is performed on-device or through secured, privacy-respecting APIs.',
    },
    {
      icon: Database,
      title: 'Data Storage',
      content: 'Documents and records are associated with your account only. In production, you may request complete deletion of all your data at any time. We comply with applicable data protection regulations including India\'s DPDP Act.',
    },
    {
      icon: Lock,
      title: 'ABDM / FHIR Readiness',
      content: 'MedAssist is designed with ABDM (Ayushman Bharat Digital Mission) and FHIR-compatible data structures in mind. Future versions will support ABHA health ID integration and standardized health record exchange.',
    },
  ];

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{t('privacy.title', 'Privacy & Data')}</h2>
        <p className="text-sm text-slate-500">{t('privacy.subtitle', 'How MedAssist handles your health information')}</p>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm font-semibold text-blue-900 mb-1">🔒 Demo Mode Active</p>
        <p className="text-xs text-blue-700">This is a prototype using synthetic demo data only. No real patient information is collected or stored.</p>
      </div>

      {sections.map((s) => (
        <Card key={s.title}>
          <div className="flex gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <s.icon className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">{s.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{s.content}</p>
            </div>
          </div>
        </Card>
      ))}

      <Card>
        <CardHeader title="Your Data Rights" />
        <div className="space-y-2">
          <Button variant="secondary" size="sm" icon={Download} className="w-full justify-start">
            Download My Data (Demo)
          </Button>
          <Button variant="ghost" size="sm" icon={Trash2} className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600">
            Delete All My Data (Demo)
          </Button>
        </div>
      </Card>

      <p className="text-xs text-slate-400 leading-relaxed">
        MedAssist is a hackathon prototype. It does not claim HIPAA, ABDM, or any medical certification. The system uses synthetic data only and must not be used with real patient records.
      </p>
    </div>
  );
}
