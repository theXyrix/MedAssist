import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, ArrowRight, Lock, Mail, Sparkles, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, demoLogin } = useAuth();
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const res = await login(form.email, form.password);
    setLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Invalid credentials. Try demo login or create an account.');
    }
  };

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    setError(null);
    const res = await demoLogin();
    setDemoLoading(false);
    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error || 'Demo login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg mb-3">
              <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-bold text-white font-display">MedAssist</h1>
            <p className="text-blue-300 text-sm">AI-Powered Personal Health Copilot</p>
          </div>

          <h2 className="text-lg font-semibold text-white mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-6">Sign in to your health dashboard</p>

          {error && (
            <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2.5 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm text-slate-300 mb-1.5 block" htmlFor="email">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="demo@medassist.ai"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300 mb-1.5 block" htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full bg-white/10 border border-white/10 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              variant="gradient"
              size="lg"
              loading={loading}
              className="w-full"
              type="submit"
              icon={ArrowRight}
              iconPosition="right"
            >
              Sign In
            </Button>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/10"></div>
              <span className="flex-shrink mx-4 text-slate-500 text-xs">or explore instantly</span>
              <div className="flex-grow border-t border-white/10"></div>
            </div>

            <Button
              variant="outline"
              size="md"
              loading={demoLoading}
              className="w-full border-blue-500/30 hover:bg-blue-500/10 text-blue-300"
              type="button"
              onClick={handleDemoLogin}
              icon={Sparkles}
            >
              Explore with Demo Account
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            New to MedAssist?{' '}
            <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Create account
            </Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-4">
          ⚕️ Secure patient data isolation backed by Supabase Auth and PostgreSQL.
        </p>
      </div>
    </div>
  );
}
