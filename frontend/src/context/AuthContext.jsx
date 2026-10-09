import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken, loginApi, signupApi, demoLoginApi, getMeApi } from '../utils/api';

const AuthContext = createContext(null);

const STORAGE_KEY_TOKEN = 'medassist_auth_token';
const STORAGE_KEY_USER = 'medassist_auth_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to persist auth state
  const saveAuth = useCallback((tokenValue, userData) => {
    setTokenState(tokenValue);
    setUser(userData);
    setAuthToken(tokenValue);
    if (tokenValue) {
      localStorage.setItem(STORAGE_KEY_TOKEN, tokenValue);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userData));
    } else {
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, []);

  // Initialize from localStorage and verify with backend
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEY_USER);

      if (storedToken) {
        setAuthToken(storedToken);
        setTokenState(storedToken);
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // invalid JSON, ignore
          }
        }

        // Verify token with backend
        try {
          const verified = await getMeApi();
          if (verified && verified.authenticated) {
            setUser(prev => ({
              ...prev,
              userId: verified.user_id,
              email: verified.email,
              patientId: verified.patient_id,
              patientName: verified.patient_name,
            }));
          }
        } catch (err) {
          console.warn('[Auth] Token verification failed:', err);
        }
      }
      setLoading(false);
    }

    initAuth();
  }, [saveAuth]);

  const login = async (email, password) => {
    const res = await loginApi(email, password);
    if (res && res.access_token) {
      const userData = {
        userId: res.user_id,
        email: res.email,
        patientId: res.patient_id || 'patient-demo-001',
        patientName: res.patient_name || email.split('@')[0],
      };
      saveAuth(res.access_token, userData);
      return { success: true };
    }
    return { success: false, error: res?.detail || 'Invalid email or password' };
  };

  const signup = async (name, email, password) => {
    const res = await signupApi(name, email, password);
    if (res && res.access_token) {
      const userData = {
        userId: res.user_id,
        email: res.email,
        patientId: res.patient_id || 'patient-demo-001',
        patientName: res.name || name,
      };
      saveAuth(res.access_token, userData);
      return { success: true };
    }
    return { success: false, error: res?.detail || 'Registration failed' };
  };

  const demoLogin = async () => {
    const res = await demoLoginApi();
    if (res && res.access_token) {
      const userData = {
        userId: res.user_id,
        email: res.email,
        patientId: res.patient_id || 'patient-demo-001',
        patientName: res.patient_name || 'Demo Patient',
      };
      saveAuth(res.access_token, userData);
      return { success: true };
    }
    return { success: false, error: 'Demo login unavailable' };
  };

  const logout = () => {
    saveAuth(null, null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        patientId: user?.patientId || 'patient-demo-001',
        patientName: user?.patientName || 'Demo Patient',
        isAuthenticated: !!token,
        loading,
        login,
        signup,
        demoLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
