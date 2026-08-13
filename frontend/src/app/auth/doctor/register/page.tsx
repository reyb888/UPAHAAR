'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, CheckCircle2, XCircle, Eye, EyeOff, Shield, Stethoscope } from 'lucide-react';
import Link from 'next/link';

export default function DoctorRegister() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const passwordRules = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'At least one lowercase letter (a-z)', test: (p: string) => /[a-z]/.test(p) },
    { label: 'At least one number (0-9)', test: (p: string) => /[0-9]/.test(p) },
    { label: 'At least one special character (!@#$...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const validatePassword = (pw: string): string | null => {
    for (const rule of passwordRules) {
      if (!rule.test(pw)) return `Password must meet all requirements below.`;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const pwError = validatePassword(formData.password);
    if (pwError) {
      setPasswordError(pwError);
      setPasswordTouched(true);
      return;
    }
    if (formData.password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'DOCTOR',
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        if (data.email_confirmation_required) {
          alert(`Please check your email to verify your account before logging in.`);
        }
        setSuccessId(data.upahaar_id);
      } else {
        setSubmitError(data.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to connect to the backend server. Is it running on port 5000?');
    } finally {
      setIsLoading(false);
    }
  };

  if (successId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-medical-light to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50 text-center"
        >
          <div className="bg-medical-blue p-8 text-white">
            <CheckCircle className="mx-auto mb-4" size={56} strokeWidth={1.5} />
            <h2 className="text-2xl font-bold mb-1">Doctor Registration Complete</h2>
            <p className="text-blue-100 text-sm">Your UPAHAAR doctor account has been created.</p>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Your Official UPAHAAR Doctor ID is:</p>
              <div className="text-2xl font-mono font-bold text-medical-blue bg-blue-50 dark:bg-blue-900/20 py-4 px-6 rounded-xl border border-blue-100 dark:border-blue-900/30 tracking-widest">
                {successId}
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400 font-bold">⚠ Please note this down!</p>
              <p className="text-xs text-red-500 dark:text-red-500 mt-1">You will need this ID to log in to your account.</p>
            </div>

            <Link
              href="/auth/doctor/login"
              className="w-full inline-block bg-medical-blue text-white py-3 rounded-xl font-bold text-center hover:bg-blue-700 transition-colors"
            >
              Proceed to Doctor Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-medical-light to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50"
      >
        <div className="bg-medical-blue p-8 text-white text-center">
          <Stethoscope className="mx-auto mb-3" size={32} strokeWidth={1.5} />
          <h2 className="text-3xl font-bold mb-2">Doctor Registration</h2>
          <p className="text-blue-100">Create your unified digital medical practice identity</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full Name (Dr.)</label>
              <input 
                type="text" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50 dark:bg-slate-800/50"
                placeholder="Dr. Sarah Chen"
                onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text:text-gray-300">Email Address</label>
              <input 
                type="email" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50 dark:bg-slate-800/50"
                placeholder="dr.chen@clinic.com"
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone Number</label>
              <input 
                type="tel" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50 dark:bg-slate-800/50"
                placeholder="+91 9876543210"
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Secure Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} required
                  className={`w-full px-4 py-3 pr-12 rounded-xl border focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50 dark:bg-slate-800/50 ${
                    passwordTouched && passwordError ? 'border-red-400 bg-red-50/30 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-600'
                  }`}
                  placeholder="••••••••"
                  onChange={e => {
                    const val = e.target.value;
                    setFormData({...formData, password: val});
                    if (passwordTouched) setPasswordError(validatePassword(val));
                    if (confirmPassword) setConfirmPasswordError(val !== confirmPassword ? 'Passwords do not match.' : null);
                  }}
                  onBlur={e => {
                    setPasswordTouched(true);
                    setPasswordError(validatePassword(e.target.value));
                  }}
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

              {/* Password requirements checklist */}
              {(passwordTouched || formData.password.length > 0) && (
                <div className="mt-2 space-y-1 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Password must include:</p>
                  {passwordRules.map((rule, i) => {
                    const met = rule.test(formData.password);
                    return (
                      <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${
                        met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {met
                          ? <CheckCircle2 size={13} className="text-green-500 dark:text-green-400 shrink-0" />
                          : <XCircle size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
                        }
                        {rule.label}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Inline password error */}
              {passwordTouched && passwordError && (
                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                  <XCircle size={13} className="shrink-0" /> {passwordError}
                </p>
              )}

              {/* Confirm Password */}
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mt-4">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'} required
                  className={`w-full px-4 py-3 pr-12 rounded-xl border focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50 dark:bg-slate-800/50 ${
                    confirmPasswordError ? 'border-red-400 bg-red-50/30 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-600'
                  }`}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => {
                    setConfirmPassword(e.target.value);
                    setConfirmPasswordError(e.target.value !== formData.password ? 'Passwords do not match.' : null);
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                  <XCircle size={13} className="shrink-0" /> {confirmPasswordError}
                </p>
              )}
            </div>
          </div>

          {/* Server-side error */}
          {submitError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl p-4 flex items-start gap-3">
              <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{submitError}</p>
            </div>
          )}

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-all flex justify-center items-center gap-2 ${isLoading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-medical-blue shadow-blue-500/30 hover:shadow-blue-500/50'}`}
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Account...
              </>
            ) : (
              'Create Doctor Account'
            )}
          </motion.button>
          
          <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-4">
            Already have an account? <Link href="/auth/doctor/login" className="text-medical-blue font-semibold hover:underline">Login here</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}