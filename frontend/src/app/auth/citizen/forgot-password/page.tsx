'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

type Step = 'id' | 'otp' | 'password' | 'success';

export default function CitizenForgotPassword() {
  const [step, setStep] = useState<Step>('id');
  const [upahaarId, setUpahaarId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upahaar_id: upahaarId })
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

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
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
        body: JSON.stringify({ upahaar_id: upahaarId, otp_code: otpCode, new_password: newPassword })
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
    { key: 'id', label: 'Verify ID' },
    { key: 'otp', label: 'Enter Code' },
    { key: 'password', label: 'New Password' }
  ];

  const currentStepIndex = step === 'success' ? 3 : stepIndicators.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light to-blue-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
      >
        {/* Header */}
        <div className="bg-medical-dark p-8 text-white text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </motion.div>
          <h2 className="text-2xl font-bold mb-1">Reset Password</h2>
          <p className="text-blue-200 text-sm">Verify your identity to recover access</p>
        </div>

        {/* Step Indicators */}
        {step !== 'success' && (
          <div className="px-8 pt-6">
            <div className="flex items-center justify-between">
              {stepIndicators.map((s, i) => (
                <div key={s.key} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      i <= currentStepIndex
                        ? 'bg-medical-blue text-white shadow-lg shadow-blue-500/30'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {i < currentStepIndex ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium ${i <= currentStepIndex ? 'text-medical-blue' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < stepIndicators.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all duration-500 ${
                      i < currentStepIndex ? 'bg-medical-blue' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Enter UPAHAAR ID */}
            {step === 'id' && (
              <motion.form key="id" variants={stepVariants} initial="initial" animate="animate" exit="exit" onSubmit={handleRequestOTP} className="space-y-5">
                <p className="text-gray-500 text-sm">Enter your UPAHAAR ID and we&apos;ll send a verification code to your registered email.</p>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">UPAHAAR ID</label>
                  <input
                    type="text" required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none bg-gray-50/50 transition-all"
                    placeholder="UPHR-1234567890"
                    value={upahaarId}
                    onChange={e => setUpahaarId(e.target.value)}
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
                    <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Send Verification Code</>
                  )}
                </motion.button>
                <p className="text-center text-sm text-gray-600">
                  Remember your password? <Link href="/auth/citizen/login" className="text-medical-blue font-semibold hover:underline">Login</Link>
                </p>
              </motion.form>
            )}

            {/* Step 2: Enter OTP */}
            {step === 'otp' && (
              <motion.form key="otp" variants={stepVariants} initial="initial" animate="animate" exit="exit" onSubmit={handleVerifyOTP} className="space-y-5">
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <p className="text-gray-600 text-sm">Verification code sent to</p>
                  <p className="text-medical-dark font-bold text-lg">{maskedEmail}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">6-Digit Verification Code</label>
                  <input
                    type="text" required maxLength={6}
                    className="w-full px-4 py-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none bg-gray-50/50 text-center text-2xl font-mono tracking-[0.5em] transition-all"
                    placeholder="000000"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">Code expires in 10 minutes</p>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-medical-dark text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-900/30"
                  type="submit"
                >
                  Verify Code
                </motion.button>
                <button type="button" onClick={() => { setStep('id'); setError(''); }} className="w-full text-sm text-gray-500 hover:text-medical-blue transition-colors">
                  ← Use a different UPAHAAR ID
                </button>
              </motion.form>
            )}

            {/* Step 3: Set New Password */}
            {step === 'password' && (
              <motion.form key="password" variants={stepVariants} initial="initial" animate="animate" exit="exit" onSubmit={handleResetPassword} className="space-y-5">
                <p className="text-gray-500 text-sm">Choose a strong new password for your account.</p>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">New Password</label>
                  <input
                    type="password" required minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none bg-gray-50/50 transition-all"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700">Confirm Password</label>
                  <input
                    type="password" required minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue outline-none bg-gray-50/50 transition-all"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs font-medium">Passwords do not match</p>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${isLoading ? 'bg-gray-400 cursor-not-allowed shadow-none' : 'bg-medical-dark shadow-blue-900/30'}`}
                  type="submit" disabled={isLoading}
                >
                  {isLoading ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting...</>
                  ) : 'Reset Password'}
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
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </motion.div>
                <h3 className="text-xl font-bold text-gray-800">Password Reset Successful!</h3>
                <p className="text-gray-500 text-sm">Your password has been updated. You can now login with your new credentials.</p>
                <Link href="/auth/citizen/login">
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
