import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import { useLanguage } from '../context/LanguageContext';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>

        {/* Footer disclaimer */}
        <footer className="px-4 lg:px-6 py-3 border-t border-slate-100 bg-white">
          <p className="text-[11px] text-slate-400 text-center">
            ⚕️ {t('common.disclaimer', 'MedAssist provides information and organization based on uploaded medical records. It does not diagnose conditions or replace professional medical advice.')}
          </p>
        </footer>
      </div>
    </div>
  );
}
