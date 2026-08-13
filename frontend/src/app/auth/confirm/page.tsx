'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

type Status = 'verifying' | 'success' | 'error';

export default function ConfirmEmail() {
  const [status, setStatus] = useState<Status>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token_hash = params.get('token_hash') || params.get('token');
    const type = params.get('type') || 'signup';

    if (!token_hash) {
      setStatus('error');
      setMessage('This confirmation link is invalid or missing its token.');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_hash, type })
    })
      .then(async res => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully. You can now log in.');
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The link may be expired.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('Failed to connect to the backend server. Please try again later.');
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light to-blue-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 text-center"
      >
        <div className={`p-8 ${status === 'success' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-medical-blue'} text-white`}>
          {status === 'verifying' && (
            <>
              <Loader2 className="mx-auto mb-4 animate-spin" size={56} strokeWidth={1.5} />
              <h2 className="text-2xl font-bold mb-1">Verifying your email...</h2>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="mx-auto mb-4" size={56} strokeWidth={1.5} />
              <h2 className="text-2xl font-bold mb-1">Email Verified!</h2>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="mx-auto mb-4" size={56} strokeWidth={1.5} />
              <h2 className="text-2xl font-bold mb-1">Verification Failed</h2>
            </>
          )}
        </div>

        <div className="p-8 space-y-6">
          <p className="text-gray-600 text-sm">{message}</p>

          {status !== 'verifying' && (
            <Link
              href="/auth/citizen/login"
              className="w-full inline-block bg-medical-blue text-white py-3 rounded-xl font-bold text-center hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </Link>
          )}

          {status === 'success' && (
            <p className="text-xs text-gray-400">
              Are you a doctor?{' '}
              <Link href="/auth/doctor/login" className="text-medical-blue font-medium hover:underline">
                Doctor Login
              </Link>
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
