import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import AppLayout from './layouts/AppLayout';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import UploadDocument from './pages/UploadDocument';
import Timeline from './pages/Timeline';
import Trends from './pages/Trends';
import Medications from './pages/Medications';
import Copilot from './pages/Copilot';
import DoctorSummary from './pages/DoctorSummary';
import EmergencyCard from './pages/EmergencyCard';
import ConflictDetector from './pages/ConflictDetector';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';
import Privacy from './pages/Privacy';
import Login from './pages/Login';
import Signup from './pages/Signup';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* App routes */}
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/upload" element={<UploadDocument />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/trends" element={<Trends />} />
              <Route path="/medications" element={<Medications />} />
              <Route path="/copilot" element={<Copilot />} />
              <Route path="/doctor-summary" element={<DoctorSummary />} />
              <Route path="/conflicts" element={<ConflictDetector />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/emergency-card" element={<EmergencyCard />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/privacy" element={<Privacy />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}
