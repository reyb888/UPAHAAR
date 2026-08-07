'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Mail, KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';

type Step = 'id' | 'otp' | 'password' | 'success';

export default function DoctorForgotPassword() {
  const [step, setStep] = useState<Step>('id');
  const [upahaarId, setUpahaarId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      setError('Error connecting to server. Is the backend running?');
    } finally {
      setLoading(false);
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

    setLoading(true);

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
      setError('Error connecting to server.');
    } finally {
      setLoading(false);
    }
  };

  const stepVariants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 }
  };

  const stepIndicators = [
    { key: 'id', label: 'Verify ID', icon: Shield },
    { key: 'otp', label: 'Enter Code', icon: Mail },
    { key: 'password', label: 'New Password', icon: KeyRound }
  ];

  const currentStepIndex = step === 'success' ? 3 : stepIndicators.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center"><Shield className="text-medical-dark" size={48} /></div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Reset Password</h2>
        <p className="mt-2 text-center text-sm text-gray-600">Doctor Portal — Verify your identity</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border-t-4 border-medical-dark"
        >
          {/* Step Indicators */}
          {step !== 'success' && (
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {stepIndicators.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                          i <= currentStepIndex
                            ? 'bg-medical-dark text-white shadow-md'
                            : 'bg-gray-100 text-gray-400'
                        }`}>
                          {i < currentStepIndex ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <Icon size={18} />
                          )}
                        </div>
                        <span className={`text-[10px] mt-1.5 font-semibold ${i <= currentStepIndex ? 'text-medical-dark' : 'text-gray-400'}`}>
                          {s.label}
                        </span>
                      </div>
                      {i < stepIndicators.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-3 mb-5 transition-all duration-500 ${
                          i < currentStepIndex ? 'bg-medical-dark' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 bg-red-50 text-red-500 p-3 rounded-lg text-sm font-semibold"
            >
              {error}
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1: Enter UPAHAAR ID */}
            {step === 'id' && (
              <motion.form key="id" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6" onSubmit={handleRequestOTP}>
                <p className="text-gray-500 text-sm">Enter your Doctor UPAHAAR ID and we&apos;ll send a verification code to your registered email address.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Doctor UPAHAAR ID</label>
                  <input
                    required
                    className="mt-1 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-medical-dark focus:border-transparent outline-none transition-all"
                    type="text"
                    placeholder="UPHR-XXXXXX"
                    value={upahaarId}
                    onChange={(e) => setUpahaarId(e.target.value)}
                  />
                </div>
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-medical-dark hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                  ) : (
                    <><Mail size={16} /> Send Verification Code</>
                  )}
                </button>
                <div className="text-sm text-center">
                  <a href="/auth/doctor/login" className="font-medium text-medical-dark hover:underline flex items-center justify-center gap-1">
                    <ArrowLeft size={14} /> Back to Login
                  </a>
                </div>
              </motion.form>
            )}

            {/* Step 2: Enter OTP */}
            {step === 'otp' && (
              <motion.form key="otp" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6" onSubmit={handleVerifyOTP}>
                <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-gray-500 text-sm">Verification code sent to</p>
                  <p className="text-medical-dark font-bold text-lg">{maskedEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">6-Digit Verification Code</label>
                  <input
                    required maxLength={6}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-4 text-center text-2xl font-mono tracking-[0.5em] focus:ring-2 focus:ring-medical-dark focus:border-transparent outline-none transition-all"
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">Code expires in 10 minutes</p>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-medical-dark hover:bg-gray-800 transition-colors"
                >
                  Verify Code
                </button>
                <button type="button" onClick={() => { setStep('id'); setError(''); }} className="w-full text-sm text-gray-500 hover:text-medical-dark transition-colors flex items-center justify-center gap-1">
                  <ArrowLeft size={14} /> Use a different UPAHAAR ID
                </button>
              </motion.form>
            )}

            {/* Step 3: Set New Password */}
            {step === 'password' && (
              <motion.form key="password" variants={stepVariants} initial="initial" animate="animate" exit="exit" className="space-y-6" onSubmit={handleResetPassword}>
                <p className="text-gray-500 text-sm">Choose a strong new password for your doctor account.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password</label>
                  <input
                    required minLength={6}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-medical-dark focus:border-transparent outline-none transition-all"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input
                    required minLength={6}
                    className="mt-1 w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-medical-dark focus:border-transparent outline-none transition-all"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs font-medium">Passwords do not match</p>
                )}
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-medical-dark hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Resetting...</>
                  ) : (
                    <><KeyRound size={16} /> Reset Password</>
                  )}
                </button>
              </motion.form>
            )}

            {/* Success */}
            {step === 'success' && (
              <motion.div key="success" variants={stepVariants} initial="initial" animate="animate" className="text-center space-y-5 py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto"
                >
                  <CheckCircle2 size={40} className="text-green-600" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-800">Password Reset Successful!</h3>
                <p className="text-gray-500 text-sm">Your password has been updated. You can now login with your new credentials.</p>
                <a href="/auth/doctor/login">
                  <button className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-medical-dark hover:bg-gray-800 transition-colors mt-2">
                    Go to Login
                  </button>
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
