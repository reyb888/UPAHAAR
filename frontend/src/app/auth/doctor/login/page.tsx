'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Eye, EyeOff, Shield, Stethoscope } from 'lucide-react';

export default function DoctorLogin() {
  const [credentials, setCredentials] = useState({ upahaar_id: '', password: '', totp_code: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await response.json();
      if (response.ok) {
        if (data.role !== 'DOCTOR') {
            setError("Access denied: You are not registered as a Doctor.");
            setIsLoading(false);
            return;
        }
        localStorage.setItem('upahaar_token', data.token);
        localStorage.setItem('upahaar_role', data.role);
        window.location.href = '/dashboard/doctor';
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to connect to the backend server. Is it running on port 5000?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-medical-light to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50"
      >
        <div className="bg-medical-dark p-8 text-white text-center">
          <Stethoscope className="mx-auto mb-3" size={32} strokeWidth={1.5} />
          <h2 className="text-3xl font-bold mb-2">Doctor Portal</h2>
          <p className="text-blue-200">Secure access for healthcare providers</p>
        </div>

        <div className="p-8">
          <motion.form 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleLogin} 
            className="space-y-6"
          >
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl p-4 flex items-start gap-3">
                <Shield size={18} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Doctor UPAHAAR ID or Email</label>
              <input 
                type="text" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none bg-gray-50/50 dark:bg-slate-800/50"
                placeholder="UPHR-XXXXXX or dr@clinic.com"
                onChange={e => setCredentials({...credentials, upahaar_id: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none bg-gray-50/50 dark:bg-slate-800/50"
                  placeholder="••••••••"
                  onChange={e => setCredentials({...credentials, password: e.target.value})}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="text-right">
                <Link href="/auth/doctor/forgot-password" className="text-xs text-medical-blue font-semibold hover:underline">
                  Forgot Password?
                </Link>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Authenticator Code</label>
              <input 
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none bg-gray-50/50 dark:bg-slate-800/50"
                placeholder="Leave blank if 2FA is off"
                onChange={e => setCredentials({...credentials, totp_code: e.target.value})}
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-medical-dark shadow-blue-900/30 hover:bg-blue-900'}`}
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Authenticating...
                </>
              ) : 'Secure Login'}
            </motion.button>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              New to UPAHAAR? <Link href="/auth/doctor/register" className="text-medical-blue font-semibold hover:underline">Register as Doctor</Link>
            </p>
          </motion.form>
        </div>
      </motion.div>
    </div>
  );
}