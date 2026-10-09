import { Globe, Check } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function LanguageSelector({ variant = 'compact' }) {
  const { language, setLanguage, languages } = useLanguage();

  if (variant === 'full') {
    return (
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-slate-400" />
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Select display language"
        >
          {languages.map((l) => (
            <option key={l.code} value={l.code}>
              {l.nativeName} ({l.name})
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
      <div className="px-1.5 text-slate-400 flex items-center">
        <Globe className="w-3.5 h-3.5" />
      </div>
      {languages.map((l) => (
        <button
          key={l.code}
          onClick={() => setLanguage(l.code)}
          className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
            language === l.code
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title={`${l.name} (${l.nativeName})`}
          aria-label={`Switch language to ${l.name}`}
        >
          {l.nativeName}
        </button>
      ))}
    </div>
  );
}
