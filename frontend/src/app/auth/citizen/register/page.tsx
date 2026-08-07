'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Users, CheckCircle, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function CitizenRegister() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    dob: '',
    face_photo: null as File | null,
  });

  const [familyHistory, setFamilyHistory] = useState<Array<{ relation: string; disease: string; notes?: string }>>([
    { relation: '', disease: '', notes: '' }
  ]);
  const [showFamilyHistoryTab, setShowFamilyHistoryTab] = useState(false);

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

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const addFamilyHistory = () => {
    setFamilyHistory([...familyHistory, { relation: '', disease: '', notes: '' }]);
  };

  const removeFamilyHistory = (index: number) => {
    if (familyHistory.length > 1) {
      setFamilyHistory(familyHistory.filter((_, i) => i !== index));
    } else {
      setFamilyHistory([{ relation: '', disease: '', notes: '' }]);
    }
  };

  const updateFamilyHistory = (index: number, field: 'relation' | 'disease' | 'notes', value: string) => {
    const updated = familyHistory.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setFamilyHistory(updated);
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
      let face_photo_url: string | null = null;
      if (formData.face_photo) {
        face_photo_url = await getBase64(formData.face_photo);
      }

      const cleanedFamilyHistory = familyHistory.filter(
        item => item.relation.trim() || item.disease.trim() || (item.notes && item.notes.trim())
      );

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'CITIZEN',
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          dob: formData.dob,
          face_photo_url,
          family_history: cleanedFamilyHistory.length > 0 ? cleanedFamilyHistory : null
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
      <div className="min-h-screen bg-gradient-to-br from-medical-light to-blue-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/20 text-center"
        >
          <div className="bg-medical-blue p-8 text-white">
            <CheckCircle className="mx-auto mb-4" size={56} strokeWidth={1.5} />
            <h2 className="text-2xl font-bold mb-1">Registration Successful!</h2>
            <p className="text-blue-100 text-sm">Your UPAHAAR account has been created.</p>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <p className="text-gray-500 text-sm mb-2">Your Official UPAHAAR Patient ID is:</p>
              <div className="text-2xl font-mono font-bold text-medical-blue bg-blue-50 py-4 px-6 rounded-xl border border-blue-100 tracking-widest">
                {successId}
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
              <p className="text-sm text-red-600 font-bold">⚠ Please note this down!</p>
              <p className="text-xs text-red-500 mt-1">You will need this ID to log in to your account.</p>
            </div>

            <Link
              href="/auth/citizen/login"
              className="w-full inline-block bg-medical-blue text-white py-3 rounded-xl font-bold text-center hover:bg-blue-700 transition-colors"
            >
              Proceed to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light to-blue-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20"
      >
        <div className="bg-medical-blue p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-2">Citizen Registration</h2>
          <p className="text-blue-100">Create your unified digital medical identity</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Full Name</label>
              <input 
                type="text" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50"
                placeholder="John Doe"
                onChange={e => setFormData({...formData, full_name: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Email Address</label>
              <input 
                type="email" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50"
                placeholder="john@example.com"
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Phone Number (For OTP)</label>
              <input 
                type="tel" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50"
                placeholder="+91 9876543210"
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Date of Birth</label>
              <input 
                type="date" required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50"
                onChange={e => setFormData({...formData, dob: e.target.value})}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-700">Secure Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} required
                  className={`w-full px-4 py-3 pr-12 rounded-xl border focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50 ${
                    passwordTouched && passwordError ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password requirements checklist */}
              {(passwordTouched || formData.password.length > 0) && (
                <div className="mt-2 space-y-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Password must include:</p>
                  {passwordRules.map((rule, i) => {
                    const met = rule.test(formData.password);
                    return (
                      <div key={i} className={`flex items-center gap-2 text-xs transition-colors ${
                        met ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {met
                          ? <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                          : <XCircle size={13} className="text-gray-300 shrink-0" />
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
              <label className="text-sm font-semibold text-gray-700 block mt-4">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'} required
                  className={`w-full px-4 py-3 pr-12 rounded-xl border focus:ring-2 focus:ring-medical-blue focus:border-transparent outline-none transition-all bg-gray-50/50 ${
                    confirmPasswordError ? 'border-red-400 bg-red-50/30' : 'border-gray-200'
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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

          {/* Family Disease History Section Tab */}
          <div className="border border-blue-100 rounded-2xl bg-blue-50/40 overflow-hidden">
            <div 
              onClick={() => setShowFamilyHistoryTab(!showFamilyHistoryTab)}
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-blue-50/80 transition-colors"
            >
              <div className="flex items-center gap-2 text-medical-blue font-bold">
                <Users size={20} />
                <span>Add Family Disease History (Optional)</span>
              </div>
              <button
                type="button"
                className="text-xs bg-white text-medical-blue border border-medical-blue/30 px-3 py-1.5 rounded-lg font-bold hover:bg-medical-blue hover:text-white transition-colors"
              >
                {showFamilyHistoryTab ? 'Hide Tab' : '+ Add Family Disease History'}
              </button>
            </div>

            {showFamilyHistoryTab && (
              <div className="p-4 border-t border-blue-100 bg-white space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">Record diseases or medical conditions of family members.</p>
                  <button
                    type="button"
                    onClick={addFamilyHistory}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-medical-blue hover:bg-blue-100 px-3 py-1.5 rounded-lg font-bold transition-all border border-blue-100"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                        <th className="py-2.5 px-3 w-1/3">Relation</th>
                        <th className="py-2.5 px-3 w-1/3">Disease / Medical Condition</th>
                        <th className="py-2.5 px-3">Notes (Optional)</th>
                        <th className="py-2.5 px-3 w-10 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {familyHistory.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50/50">
                          <td className="p-2">
                            <select
                              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none bg-white focus:ring-1 focus:ring-medical-blue text-xs font-medium"
                              value={item.relation}
                              onChange={e => updateFamilyHistory(index, 'relation', e.target.value)}
                            >
                              <option value="">Select Relation</option>
                              <option value="Father">Father</option>
                              <option value="Mother">Mother</option>
                              <option value="Brother">Brother</option>
                              <option value="Sister">Sister</option>
                              <option value="Grandfather">Grandfather</option>
                              <option value="Grandmother">Grandmother</option>
                              <option value="Son">Son</option>
                              <option value="Daughter">Daughter</option>
                              <option value="Uncle">Uncle</option>
                              <option value="Aunt">Aunt</option>
                              <option value="Spouse">Spouse</option>
                              <option value="Other">Other</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="e.g. Diabetes, Heart Disease"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none bg-white focus:ring-1 focus:ring-medical-blue text-xs"
                              value={item.disease}
                              onChange={e => updateFamilyHistory(index, 'disease', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="e.g. Diagnosed at age 50"
                              className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 outline-none bg-white focus:ring-1 focus:ring-medical-blue text-xs"
                              value={item.notes || ''}
                              onChange={e => updateFamilyHistory(index, 'notes', e.target.value)}
                            />
                          </td>
                          <td className="p-2 text-center">
                            {familyHistory.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeFamilyHistory(index)}
                                className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-1.5 rounded-lg transition-colors inline-flex items-center justify-center"
                                title="Remove Entry"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 mt-4">
            <label className="text-sm font-semibold text-gray-700">Face Recognition Photo (Emergency Access)</label>
            <div className="border-2 border-dashed border-medical-blue/30 rounded-xl p-6 text-center hover:bg-blue-50/50 transition-colors cursor-pointer">
              <input 
                type="file" accept="image/*"
                className="hidden" id="face-upload"
                onChange={e => setFormData({...formData, face_photo: e.target.files?.[0] || null})}
              />
              <label htmlFor="face-upload" className="cursor-pointer">
                <span className="text-medical-blue font-semibold">Click to upload</span> or drag and drop
                <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
              </label>
              {formData.face_photo && <p className="mt-2 text-sm text-green-600 font-medium">Selected: {formData.face_photo.name}</p>}
            </div>
          </div>

          {/* Server-side error */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 font-medium">{submitError}</p>
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
                Connecting to Server...
              </>
            ) : (
              'Create UPAHAAR Account'
            )}
          </motion.button>
          
          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account? <Link href="/auth/citizen/login" className="text-medical-blue font-semibold hover:underline">Login here</Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
