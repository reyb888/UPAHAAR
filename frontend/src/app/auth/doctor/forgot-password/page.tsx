'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { CheckCircle2, Mail, Shield, KeyRound, ArrowLeft, Stethoscope, Eye, EyeOff, XCircle } from 'lucide-react';

type Step = 'id' | 'otp' | 'password' | 'success';

export default function DoctorForgotPassword() {
  const [step, setStep] = useState<Step>('id');
  const [email, setEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();

      if (response.ok) {
        setMaskedEmail(data.masked_email);
        setStep('otp');
      } else {
        setError(data.message);
      }
    } catch {
      setError('Failed to connect to server. Is the backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setError('');
    setStep('password');
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pwError = validatePassword(newPassword);
    if (pwError) {
      setError(pwError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otpCode, new_password: newPassword })
      });
      const data = await response.json();

      if (response.ok) {
        setStep('success');
      } else {
        setError(data.message);
      }
    } catch {
      setError('Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 }
  };

  const stepIndicators = [
    { key: 'id', label: 'Verify Email', icon: Shield },
    { key: 'otp', label: 'Enter Code', icon: Mail },
    { key: 'password', label: 'New Password', icon: KeyRound }
  ];

  const currentStepIndex = step === 'success' ? 3 : stepIndicators.findIndex(s => s.key === step);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-medical-light to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 dark:border-slate-700/50"
      >
        {/* Header */}
        <div className="bg-medical-dark p-8 text-white text-center">
          <Stethoscope className="mx-auto mb-3" size={32} strokeWidth={1.5} />
          <h2 className="text-2xl font-bold mb-1">Reset Password</h2>
          <p className="text-blue-200 text-sm">Doctor Portal — Verify your identity to recover access</p>
        </div>

        {/* Step Indicators */}
        {step !== 'success' && (
          <div className="px-8 pt-6">
            <div className="flex items-center justify-between">
              {stepIndicators.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                        i <= currentStepIndex
                          ? 'bg-medical-blue text-white shadow-lg shadow-blue-500/30'
                          : 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500'
                      }`}>
                        {i < currentStepIndex ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                      </div>
                      <span className={`text-[10px] mt-1 font-medium ${i <= currentStepIndex ? 'text-medical-blue' : 'text-gray-400 dark:text-gray-500'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < stepIndicators.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all duration-500 ${
                        i < currentStepIndex ? 'bg-medical-blue' : 'bg-gray-200 dark:bg-slate-700'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900/30"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Enter Email */}
            {step === 'id' && (
              <motion.form key="id" variants={stepVariants} initial="initial" animate="animate" exit="exit" onSubmit={handleRequestOTP} className="space-y-5">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Enter your registered email address and we&apos;ll send a verification code to your email.</p>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Email Address</label>
                  <input
                    type="email" required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none bg-gray-50/50 dark:bg-slate-800/50 transition-all"
                    placeholder="doctor.name@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-medical-dark shadow-blue-900/30'}`}
                  type="submit" disabled={isLoading}
                >
                  {isLoading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                  ) : (
                    <><Mail size={18} /> Send Verification Code</>
                  )}
                </motion.button>
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  Remember your password? <Link href="/auth/doctor/login" className="text-medical-blue font-semibold hover:underline">Login</Link>
                </p>
              </motion.form>
            )}

            {/* Step 2: Enter OTP */}
            {step === 'otp' && (
              <motion.form key="otp" variants={stepVariants} initial="initial" animate="animate" exit="exit" onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Verification code sent to</p>
                  <p className="text-medical-dark font-bold text-lg">{maskedEmail}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">6-Digit Verification Code</label>
                  <input
                    type="text" required maxLength={6}
                    className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-slate-600 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none bg-gray-50/50 dark:bg-slate-800/50 text-center text-2xl font-mono tracking-[0.5em] transition-all"
                    placeholder="000000"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">Code expires in 10 minutes</p>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-medical-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/30"
                  type="submit"
                >
                  Verify Code
                </motion.button>
                <button type="button" onClick={() => { setStep('id'); setError(''); }} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-medical-blue transition-colors flex items-center justify-center gap-1">
                  <ArrowLeft size={14} className="inline" /> Use a different email address
                </button>
              </motion.form>
            )}

            {/* Step 3: Set New Password */}
            {step === 'password' && (
              <motion.form key="password" variants={stepVariants} initial="initial" animate="animate" exit="exit" onSubmit={handleResetPassword} className="space-y-5">
                <p className="text-gray-500 dark:text-gray-400 text-sm">Choose a strong new password for your doctor account.</p>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'} required minLength={6}
                      className={`w-full px-4 py-3 pr-12 rounded-xl border focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none bg-gray-50/50 dark:bg-slate-800/50 transition-all ${
                        newPassword && validatePassword(newPassword) ? 'border-red-400 bg-red-50/30 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-600'
                      }`}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => {
                        setNewPassword(e.target.value);
                        if (confirmPassword) setConfirmPasswordError(e.target.value !== confirmPassword ? 'Passwords do not match.' : null);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Password requirements checklist */}
                  {(newPassword.length > 0) && (
                    <div className="mt-2 space-y-1 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Password must include:</p>
                      {passwordRules.map((rule, i) => {
                        const met = rule.test(newPassword);
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

                  {newPassword && validatePassword(newPassword) && (
                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                      <XCircle size={13} className="shrink-0" /> {validatePassword(newPassword)}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'} required minLength={6}
                      className={`w-full px-4 py-3 pr-12 rounded-xl border focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none bg-gray-50/50 dark:bg-slate-800/50 transition-all ${
                        confirmPassword && confirmPassword !== newPassword ? 'border-red-400 bg-red-50/30 dark:bg-red-900/20' : 'border-gray-200 dark:border-slate-600'
                      }`}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => {
                        setConfirmPassword(e.target.value);
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
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500 font-medium mt-1 flex items-center gap-1">
                      <XCircle size={13} className="shrink-0" /> Passwords do not match
                    </p>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-medical-dark shadow-blue-900/30'}`}
                  type="submit" disabled={isLoading}
                >
                  {isLoading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting...</>
                  ) : (
                    <><KeyRound size={16} /> Reset Password</>
                  )}
                </motion.button>
              </motion.form>
            )}

            {/* Success */}
            {step === 'success' && (
              <motion.div key="success" variants={stepVariants} initial="initial" animate="animate" className="text-center space-y-5">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 size={40} className="text-green-600 dark:text-green-400" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Password Reset Successful!</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Your password has been updated. You can now login with your new credentials.</p>
                <Link href="/auth/doctor/login">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-medical-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/30 mt-2"
                  >
                    Go to Login
                  </motion.button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}