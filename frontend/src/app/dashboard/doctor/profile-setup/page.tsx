'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, User, Briefcase, GraduationCap, Building, ArrowLeft, CheckCircle2, Camera, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DoctorSidebar from '../../../components/DoctorSidebar';

export default function DoctorProfileSetup() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [upahaarId, setUpahaarId] = useState('');
  const [jobProfile, setJobProfile] = useState('');
  const [education, setEducation] = useState('');

  // Work Experience array
  const [workExperiences, setWorkExperiences] = useState<Array<{ hospital: string; role: string; duration: string; description: string }>>([
    { hospital: '', role: '', duration: '', description: '' }
  ]);

  // Face Photo
  const [facePhoto, setFacePhoto] = useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const getFileUrl = (url?: string) => {
    if (!url) return '#';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('upahaar_token');
      if (!token) return;
      try {
        const response = await fetch('/api/doctors/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.full_name) setFullName(data.full_name);
          if (data.email) setEmail(data.email);
          if (data.phone) setPhone(data.phone);
          if (data.upahaar_id) setUpahaarId(data.upahaar_id);
          if (data.face_photo_url) setExistingPhotoUrl(data.face_photo_url);
          if (data.job_profile) setJobProfile(data.job_profile);
          if (data.education) setEducation(data.education);
          
          if (data.work_experience) {
            try {
              const parsed = typeof data.work_experience === 'string' 
                ? JSON.parse(data.work_experience) 
                : data.work_experience;
              if (Array.isArray(parsed) && parsed.length > 0) {
                setWorkExperiences(parsed);
              }
            } catch (e) {
              console.error("Error parsing work experiences:", e);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load doctor profile details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const addWorkExperience = () => {
    setWorkExperiences([...workExperiences, { hospital: '', role: '', duration: '', description: '' }]);
  };

  const removeWorkExperience = (index: number) => {
    if (workExperiences.length > 1) {
      setWorkExperiences(workExperiences.filter((_, i) => i !== index));
    } else {
      setWorkExperiences([{ hospital: '', role: '', duration: '', description: '' }]);
    }
  };

  const updateWorkExperience = (index: number, field: 'hospital' | 'role' | 'duration' | 'description', value: string) => {
    const updated = workExperiences.map((exp, i) => {
      if (i === index) {
        return { ...exp, [field]: value };
      }
      return exp;
    });
    setWorkExperiences(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    const token = localStorage.getItem('upahaar_token');
    if (!token) {
      setErrorMsg("Authentication token not found. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    let face_photo_url: string | null = null;
    if (facePhoto) {
      try {
        face_photo_url = await getBase64(facePhoto);
      } catch (err) {
        console.error("Failed to convert image:", err);
      }
    }

    const payload: any = {
      full_name: fullName.trim(),
      job_profile: jobProfile.trim(),
      education: education.trim(),
      work_experience: workExperiences.filter(exp => exp.hospital.trim() || exp.role.trim() || exp.duration.trim() || exp.description.trim())
    };

    if (face_photo_url) {
      payload.face_photo_url = face_photo_url;
    }

    try {
      const response = await fetch('/api/doctors/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSuccessMsg("Doctor profile updated successfully!");
        if (face_photo_url) setExistingPhotoUrl(face_photo_url);
        setTimeout(() => {
          setSuccessMsg('');
        }, 4000);
      } else {
        const errorData = await response.json();
        setErrorMsg(errorData.message || "Failed to update profile");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Network error. Could not save doctor profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
      <DoctorSidebar activePage="settings" />

      <main className="flex-1 p-6 lg:p-10 flex justify-center">
        <div className="max-w-3xl w-full space-y-6">
          
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <Link 
              href="/dashboard/doctor/settings" 
              className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-medical-blue dark:hover:text-blue-400 transition-colors bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-sm border border-gray-150 dark:border-slate-800"
            >
              <ArrowLeft size={18} /> Back to Settings
            </Link>
            <span className="text-xs font-semibold px-3 py-1 bg-blue-50 dark:bg-blue-950/60 text-medical-blue dark:text-blue-300 rounded-full border border-blue-100 dark:border-blue-900/50 flex items-center gap-1.5">
              <Shield size={14} /> Doctor Registry Profile
            </span>
          </div>

          <header>
            <h1 className="text-3xl font-extrabold text-gray-850 dark:text-white">Doctor Professional Profile</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage your medical qualifications, designation, and professional work history.</p>
          </header>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-slate-800 shadow-sm">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-medical-blue mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400 font-semibold">Loading profile data...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">

              {successMsg && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl flex items-center gap-3 font-semibold text-sm shadow-sm"
                >
                  <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  {successMsg}
                </motion.div>
              )}

              {errorMsg && (
                <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 p-4 rounded-2xl text-sm font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Card 1: Face Photo & Identification */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-medical-blue dark:text-blue-400 rounded-2xl">
                    <Camera size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-850 dark:text-white text-lg">Profile & Face Scan Photo</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Photo used for doctor profile card and portal identification</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
                  <div className="relative">
                    {facePhoto ? (
                      <img 
                        src={URL.createObjectURL(facePhoto)} 
                        alt="Preview" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-medical-blue/30 shadow-md"
                      />
                    ) : existingPhotoUrl && existingPhotoUrl !== 'dummy-url-for-now' ? (
                      <img 
                        src={getFileUrl(existingPhotoUrl)} 
                        alt="Profile Photo" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-medical-blue/30 shadow-md"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-300 rounded-full flex items-center justify-center font-bold text-3xl border border-gray-200 dark:border-slate-700">
                        {fullName ? fullName.charAt(0).toUpperCase() : 'D'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Upload New Profile Photo</label>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setFacePhoto(e.target.files[0]);
                        }
                      }}
                      className="block w-full text-xs text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 dark:file:bg-blue-950/60 file:text-medical-blue dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/60 cursor-pointer"
                    />
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">Supported formats: JPG, PNG, WEBP (Max 5MB)</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Basic & Personal Info */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                    <User size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-850 dark:text-white text-lg">Personal Details</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Your registered identification and account details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Full Name</label>
                    <input 
                      type="text"
                      required
                      placeholder="Dr. Jane Doe"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-850 dark:text-white outline-none text-sm focus:ring-2 focus:ring-medical-blue dark:focus:ring-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">UPAHAAR Doctor ID</label>
                    <input 
                      type="text"
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-mono text-sm font-bold cursor-not-allowed"
                      value={upahaarId || 'Generating...'}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email Address</label>
                    <input 
                      type="email"
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                      value={email || ''}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Phone Number</label>
                    <input 
                      type="text"
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
                      value={phone || ''}
                    />
                  </div>
                </div>
              </div>

              {/* Card 3: Job Profile & Education */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-850 dark:text-white text-lg">Job Profile & Specialization</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Your current role, department, and primary clinical specialization</p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase size={14} className="text-medical-blue dark:text-blue-400" /> Job Profile / Specialization Title
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Senior Consultant Cardiologist, Chief Surgeon, General Physician"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-850 dark:text-white outline-none text-sm focus:ring-2 focus:ring-medical-blue dark:focus:ring-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
                      value={jobProfile}
                      onChange={e => setJobProfile(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap size={14} className="text-purple-600 dark:text-purple-400" /> Medical Education & Qualifications
                    </label>
                    <textarea 
                      rows={3}
                      placeholder="e.g. MBBS - AIIMS New Delhi (2012), MD Cardiology - Harvard Medical School (2016)"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-gray-850 dark:text-white outline-none text-sm focus:ring-2 focus:ring-medical-blue dark:focus:ring-blue-500 transition-all resize-none placeholder-gray-400 dark:placeholder-gray-500"
                      value={education}
                      onChange={e => setEducation(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Past Work Experiences */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl">
                      <Building size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-850 dark:text-white text-lg">Past Work Experiences</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Add your previous clinical experience and hospital history</p>
                    </div>
                  </div>

                  <button 
                    type="button" 
                    onClick={addWorkExperience}
                    className="flex items-center gap-1.5 text-xs font-bold text-medical-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-100 dark:border-blue-900/40 px-3.5 py-2 rounded-xl transition-colors"
                  >
                    <Plus size={16} /> Add Experience
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  {workExperiences.map((exp, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50/80 dark:bg-slate-800/70 p-4.5 rounded-2xl border border-gray-200 dark:border-slate-700/80 relative space-y-3 shadow-inner"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Experience #{index + 1}
                        </span>
                        {workExperiences.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => removeWorkExperience(index)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="Remove Experience"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-1 space-y-1">
                          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Hospital / Medical Center</label>
                          <input 
                            type="text"
                            placeholder="e.g. City General Hospital"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-850 dark:text-white text-xs outline-none focus:ring-2 focus:ring-medical-blue dark:focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                            value={exp.hospital}
                            onChange={e => updateWorkExperience(index, 'hospital', e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-1 space-y-1">
                          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Designation / Role</label>
                          <input 
                            type="text"
                            placeholder="e.g. Resident Cardiologist"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-850 dark:text-white text-xs outline-none focus:ring-2 focus:ring-medical-blue dark:focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                            value={exp.role}
                            onChange={e => updateWorkExperience(index, 'role', e.target.value)}
                          />
                        </div>

                        <div className="md:col-span-1 space-y-1">
                          <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Duration / Years</label>
                          <input 
                            type="text"
                            placeholder="e.g. 2018 - 2022 (4 yrs)"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-850 dark:text-white text-xs outline-none focus:ring-2 focus:ring-medical-blue dark:focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                            value={exp.duration}
                            onChange={e => updateWorkExperience(index, 'duration', e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300">Description / Responsibilities (Optional)</label>
                        <input 
                          type="text"
                          placeholder="e.g. Headed the outpatient cardiovascular unit and supervised CCU"
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-850 dark:text-white text-xs outline-none focus:ring-2 focus:ring-medical-blue dark:focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                          value={exp.description}
                          onChange={e => updateWorkExperience(index, 'description', e.target.value)}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-medical-blue hover:bg-blue-700 text-white font-bold px-8 py-3.5 rounded-2xl shadow-md transition-all text-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving Profile...
                    </>
                  ) : (
                    'Save Doctor Profile'
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </main>
    </div>
  );
}
