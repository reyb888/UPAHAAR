'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, Clock, FileText, Settings, QrCode, Pill, CheckCircle2, Trash2, 
  ShieldAlert, Ban, Activity, X, ChevronLeft, ChevronRight, Check, Calendar, 
  Sparkles, Sun, Moon, Sunrise, Sunset, AlertCircle 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TwoFactorSetup from '../../components/TwoFactorSetup';
import GoogleTranslate from '../../components/GoogleTranslate';
import CitizenSidebar from '../../components/CitizenSidebar';
import { 
  getDosesForFrequency, 
  getMedicationDurationInfo, 
  getTodayDateString, 
  getMedicationKey,
  DoseSchedule 
} from '../../utils/medicationUtils';

export default function CitizenDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMedicines, setActiveMedicines] = useState<any[]>([]);
  const [todayDate, setTodayDate] = useState<string>(getTodayDateString());
  const [dailyTakenDoses, setDailyTakenDoses] = useState<Record<string, string[]>>({});
  const [viewModes, setViewModes] = useState<Record<string, 'summary' | 'raw'>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  // Document Modal State
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showDocModal, setShowDocModal] = useState(false);

  // Confirmation Modal State
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [medicineToRemove, setMedicineToRemove] = useState<any>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const getFileUrl = (url?: string) => {
    if (!url) return '#';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const getStorageKey = (dateStr: string, patientId?: string) => {
    return `upahaar_doses_${patientId || 'citizen'}_${dateStr}`;
  };

  const loadDailyDoses = (dateStr: string, patientId?: string) => {
    try {
      const key = getStorageKey(dateStr, patientId);
      const stored = localStorage.getItem(key);
      if (stored) {
        setDailyTakenDoses(JSON.parse(stored));
      } else {
        setDailyTakenDoses({});
      }
    } catch (e) {
      console.error("Failed to load dose logs from localStorage:", e);
      setDailyTakenDoses({});
    }
  };

  const toggleDose = (medKey: string, doseId: string) => {
    setDailyTakenDoses(prev => {
      const currentDoses = prev[medKey] || [];
      const updated = currentDoses.includes(doseId)
        ? currentDoses.filter(id => id !== doseId)
        : [...currentDoses, doseId];
      
      const nextState = { ...prev, [medKey]: updated };
      try {
        const key = getStorageKey(todayDate, profile?.id);
        localStorage.setItem(key, JSON.stringify(nextState));
      } catch (e) {
        console.error("Failed to persist dose to localStorage:", e);
      }
      return nextState;
    });
  };

  const toggleAllDoses = (medKey: string, doses: DoseSchedule[]) => {
    setDailyTakenDoses(prev => {
      const currentDoses = prev[medKey] || [];
      const allDoseIds = doses.map(d => d.id);
      const isAllTaken = allDoseIds.length > 0 && allDoseIds.every(id => currentDoses.includes(id));
      
      const updated = isAllTaken ? [] : allDoseIds;
      const nextState = { ...prev, [medKey]: updated };
      try {
        const key = getStorageKey(todayDate, profile?.id);
        localStorage.setItem(key, JSON.stringify(nextState));
      } catch (e) {
        console.error("Failed to persist dose to localStorage:", e);
      }
      return nextState;
    });
  };

  const fetchProfile = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) {
      router.push('/auth/citizen/login');
      return false;
    }
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        return true;
      } else if (response.status === 401) {
        localStorage.removeItem('upahaar_token');
        router.push('/auth/citizen/login');
        return false;
      }
      throw new Error("Failed to retrieve profile data");
    } catch (err) {
      console.error('Failed to fetch profile', err);
      throw err;
    }
  };

  const fetchTimeline = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) return false;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/timeline`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const timelineData = data.timeline || [];
        setTimeline(timelineData);

        // Combine medicines from all prescriptions and filter only active (unexpired) courses
        const allMedicines: any[] = [];
        const uniqueMedKeys = new Set<string>();
        timelineData.forEach((t: any) => {
          if (t.medicines && t.medicines !== "[]" && t.medicines !== "null") {
            try {
              const meds = JSON.parse(t.medicines);
              if (Array.isArray(meds)) {
                meds.forEach((med: any) => {
                  const medKey = getMedicationKey(med);
                  if (!uniqueMedKeys.has(medKey)) {
                    uniqueMedKeys.add(medKey);
                    const durationInfo = getMedicationDurationInfo(t.created_at, med.duration);
                    // Only display medicines whose duration hasn't expired
                    if (durationInfo.isActive) {
                      allMedicines.push({ 
                        ...med, 
                        medKey,
                        prescriptionId: t.id,
                        createdAt: t.created_at,
                        durationInfo,
                        doses: getDosesForFrequency(med.frequency)
                      });
                    }
                  }
                });
              }
            } catch (e) {
              console.error("Failed to parse medicines:", e);
            }
          }
        });
        setActiveMedicines(allMedicines);
        return true;
      } else if (response.status === 401) {
        localStorage.removeItem('upahaar_token');
        router.push('/auth/citizen/login');
        return false;
      }
      throw new Error("Failed to retrieve medical timeline");
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
      throw err;
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this medical record? This action cannot be undone.")) return;
    
    const token = localStorage.getItem('upahaar_token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/prescriptions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchTimeline(); // Refresh timeline
      } else {
        const data = await response.json();
        alert(data.message || "Failed to delete record");
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
    }
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) return false;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        return true;
      } else if (response.status === 401) {
        localStorage.removeItem('upahaar_token');
        router.push('/auth/citizen/login');
        return false;
      }
      throw new Error("Failed to retrieve security notifications");
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      throw err;
    }
  };

  const handleNotificationAction = async (id: string, action: 'acknowledge' | 'revoke') => {
    const token = localStorage.getItem('upahaar_token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/notifications/${id}/${action}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchNotifications();
      } else {
        const data = await response.json();
        alert(data.message || `Failed to ${action} notification`);
      }
    } catch (err) {
      console.error(`Failed to ${action} notification:`, err);
    }
  };

  const confirmRemoveMedicine = async () => {
    if (!medicineToRemove) return;
    setIsRemoving(true);
    const token = localStorage.getItem('upahaar_token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/prescriptions/${medicineToRemove.prescriptionId}/remove-medicine`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: medicineToRemove.name })
      });
      if (response.ok) {
        setShowRemoveModal(false);
        setMedicineToRemove(null);
        fetchTimeline(); // Refresh timeline
      } else {
        const data = await response.json();
        alert(data.message || "Failed to remove medicine.");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server.");
    } finally {
      setIsRemoving(false);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('upahaar_theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const initData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchProfile(), fetchTimeline(), fetchNotifications()]);
      } catch (err) {
        setError("Error connecting to the backend server. Please verify if it is running.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    loadDailyDoses(todayDate, profile?.id);
  }, [profile?.id, todayDate]);

  useEffect(() => {
    // Check if the date has rolled over past midnight every 30 seconds
    const interval = setInterval(() => {
      const current = getTodayDateString();
      if (current !== todayDate) {
        setTodayDate(current);
        loadDailyDoses(current, profile?.id);
        fetchTimeline();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [todayDate, profile?.id]);

  useEffect(() => {
    if (timeline.length > 0) {
      const maxPage = Math.ceil(timeline.length / itemsPerPage);
      if (currentPage > maxPage) {
        setCurrentPage(maxPage);
      }
    }
  }, [timeline.length, currentPage]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    
    const token = localStorage.getItem('upahaar_token');
    const formData = new FormData();
    formData.append('prescriptionFile', file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/prescriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // Do NOT set Content-Type here, let browser set multipart boundary
        },
        body: formData
      });

      const data = await response.json();
      if (response.ok) {
        alert("Prescription uploaded and processed by AI successfully!");
        setFile(null);
        setCurrentPage(1);
        fetchTimeline(); // Refresh the timeline to show the new document
      } else {
        alert("Upload failed: " + data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server.");
    } finally {
      setIsUploading(false);
    }
  };

  const totalPages = Math.ceil(timeline.length / itemsPerPage);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(activePage * itemsPerPage, timeline.length);
  const paginatedTimeline = timeline.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <CitizenSidebar activePage="timeline" />

      {/* Main Content Area */}
      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-visible z-50">
            <div className="flex items-center gap-4">
              {profile?.face_photo_url && profile.face_photo_url !== 'dummy-url-for-now' ? (
                <img 
                  src={getFileUrl(profile.face_photo_url)} 
                  alt="Profile" 
                  className="w-14 h-14 rounded-full object-cover border-2 border-medical-blue shadow-md"
                />
              ) : (
                <div className="w-14 h-14 bg-medical-blue/10 text-medical-blue rounded-full flex items-center justify-center font-bold text-xl border border-medical-blue/20">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Welcome back, {profile?.full_name || 'Citizen'}</h1>
                <p className="text-gray-500">Manage your medical records securely.</p>
              </div>
            </div>
            <GoogleTranslate />
          </header>

          {loading ? (
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
              <div className="w-12 h-12 border-4 border-medical-blue border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-semibold">Loading medical records...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-12 rounded-3xl shadow-sm border border-red-100 flex flex-col items-center justify-center min-h-[400px] text-center">
              <ShieldAlert size={48} className="text-red-500 mb-4 animate-bounce" />
              <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Error</h2>
              <p className="text-gray-650 text-sm max-w-md mb-6">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-medical-blue text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Timeline Column */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Security Notifications */}
              {notifications.filter(n => n.status === 'PENDING').length > 0 && (
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl shadow-sm">
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-red-800"><ShieldAlert size={24} /> Security Alerts</h2>
                  <div className="space-y-3">
                    {notifications.filter(n => n.status === 'PENDING').map((notif: any) => (
                      <div key={notif.id} className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <p className="text-red-900 font-medium"><strong>Dr. {notif.doctor_name}</strong> accessed your profile via <strong>Facial Recognition</strong>.</p>
                          <p className="text-sm text-red-600 mt-1">{new Date(notif.created_at).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button 
                            onClick={() => handleNotificationAction(notif.id, 'acknowledge')}
                            className="flex-1 sm:flex-none px-4 py-2 bg-green-100 text-green-700 hover:bg-green-200 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <CheckCircle2 size={16}/> Acknowledge
                          </button>
                          <button 
                            onClick={() => handleNotificationAction(notif.id, 'revoke')}
                            className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white hover:bg-red-700 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <Ban size={16}/> Revoke Access
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Medication Reminders */}
              {activeMedicines.length > 0 && (
                <div className="bg-gradient-to-br from-medical-blue via-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl border border-blue-400/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-white/15">
                    <div>
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Pill size={24} className="text-white drop-shadow-sm" /> 
                        Active Medication Schedule
                      </h2>
                      <p className="text-blue-100 text-xs mt-0.5">
                        Track each daily dose • Automatically refreshed each day
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/20 text-xs font-semibold self-start sm:self-auto">
                      <Calendar size={14} className="text-blue-200" />
                      <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {activeMedicines.map((med: any, idx: number) => {
                      const medKey = med.medKey || getMedicationKey(med);
                      const doses: DoseSchedule[] = med.doses || getDosesForFrequency(med.frequency);
                      const takenList: string[] = dailyTakenDoses[medKey] || [];
                      const isAllTaken = doses.length > 0 && doses.every(d => takenList.includes(d.id));
                      const durationInfo = med.durationInfo || getMedicationDurationInfo(med.createdAt, med.duration);

                      const getPeriodIcon = (period?: string) => {
                        switch (period) {
                          case 'morning':
                            return <Sun size={14} className="text-amber-300" />;
                          case 'afternoon':
                            return <Sunrise size={14} className="text-amber-200" />;
                          case 'evening':
                            return <Sunset size={14} className="text-orange-300" />;
                          case 'night':
                            return <Moon size={14} className="text-indigo-200" />;
                          default:
                            return <Clock size={14} className="text-blue-200" />;
                        }
                      };

                      return (
                        <div 
                          key={medKey || idx} 
                          className={`backdrop-blur-md p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                            isAllTaken 
                              ? 'bg-emerald-950/30 border-emerald-400/40 shadow-inner' 
                              : 'bg-white/10 hover:bg-white/15 border-white/20 shadow-md'
                          }`}
                        >
                          {/* Medicine Header Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className={`font-bold text-lg transition-all ${isAllTaken ? 'line-through text-blue-200' : 'text-white'}`}>
                                  {med.name}
                                </h3>
                                {isAllTaken && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 bg-emerald-500 text-white rounded-full shadow-sm animate-in zoom-in">
                                    <CheckCircle2 size={12} /> Completed Today
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-lg text-blue-100 font-medium">
                                  {med.frequency}
                                </span>
                                <span className="text-xs bg-indigo-500/30 border border-indigo-300/30 px-2.5 py-0.5 rounded-lg text-indigo-100 flex items-center gap-1">
                                  <Clock size={12} /> {durationInfo.statusText}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              {doses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => toggleAllDoses(medKey, doses)}
                                  className="text-xs text-blue-100 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium"
                                  title="Toggle all doses for today"
                                >
                                  {isAllTaken ? 'Reset All' : 'Take All'}
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setMedicineToRemove(med);
                                  setShowRemoveModal(true);
                                }}
                                className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-200 hover:text-white rounded-lg transition-all"
                                title="Remove Medication"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Dose Sub-buttons Grid */}
                          <div className="mt-3.5">
                            <div className="flex items-center justify-between text-xs text-blue-200 font-medium mb-2">
                              <span>Scheduled Doses ({takenList.length}/{doses.length} taken today):</span>
                              {doses.length > 0 && (
                                <span className="text-blue-100 font-bold">
                                  {Math.round((takenList.length / doses.length) * 100)}%
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {doses.map((dose) => {
                                const isTaken = takenList.includes(dose.id);
                                return (
                                  <button
                                    key={dose.id}
                                    type="button"
                                    onClick={() => toggleDose(medKey, dose.id)}
                                    className={`flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 transform active:scale-95 ${
                                      isTaken
                                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-900/30 ring-2 ring-emerald-300/60'
                                        : 'bg-white text-medical-blue hover:bg-blue-50 shadow-sm'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      {getPeriodIcon(dose.period)}
                                      <span className="truncate">{dose.label}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 text-xs font-semibold">
                                      {isTaken ? (
                                        <>
                                          <CheckCircle2 size={16} className="text-white" />
                                          <span>Taken</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-blue-600 font-medium">Take</span>
                                        </>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Mini progress line for this medication */}
                            {doses.length > 1 && (
                              <div className="w-full bg-white/15 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div 
                                  className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${(takenList.length / doses.length) * 100}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <h2 className="text-xl font-bold text-medical-dark flex items-center gap-2"><Clock size={24} /> Medical Timeline</h2>
              
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm gap-4 mt-4">
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Showing <span className="font-bold text-gray-855 dark:text-white">{startIndex + 1}</span> - <span className="font-bold text-gray-855 dark:text-white">{endIndex}</span> of <span className="font-bold text-gray-855 dark:text-white">{timeline.length}</span> prescriptions
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={activePage === 1}
                      className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                      title="Previous Page"
                    >
                      <ChevronLeft size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        type="button"
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-9 h-9 rounded-xl font-bold text-sm transition-all flex items-center justify-center ${
                          page === activePage
                            ? 'bg-medical-blue text-white shadow-md shadow-blue-500/20'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent dark:hover:border-slate-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={activePage === totalPages}
                      className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
                      title="Next Page"
                    >
                      <ChevronRight size={16} className="text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-4 mt-4">
                {timeline.length === 0 ? (
                   <p className="text-gray-500 italic p-6 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">No prescriptions uploaded yet. Use the tool on the right to upload your first record!</p>
                ) : (
                  paginatedTimeline.map((item) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      key={item.id} 
                      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-medical-blue relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-gray-800">Prescription Record</h3>
                          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {new Date(item.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleDeleteRecord(item.id)}
                          className="text-red-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <button 
                          onClick={() => { setSelectedDoc(item); setShowDocModal(true); }} 
                          className="text-sm font-semibold text-medical-blue hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <FileText size={16} /> View Original Document
                        </button>
                        {item.raw_ocr_text && (
                          <div className="flex bg-gray-100 rounded-lg p-1">
                            <button 
                              onClick={() => setViewModes(prev => ({ ...prev, [item.id]: 'summary' }))}
                              className={`text-xs px-3 py-1 rounded-md font-bold transition-colors ${viewModes[item.id] !== 'raw' ? 'bg-white text-medical-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >AI Summary</button>
                            <button 
                              onClick={() => setViewModes(prev => ({ ...prev, [item.id]: 'raw' }))}
                              className={`text-xs px-3 py-1 rounded-md font-bold transition-colors ${viewModes[item.id] === 'raw' ? 'bg-white text-medical-blue shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >Original OCR</button>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-blue-50 p-4 rounded-xl mt-3">
                        {viewModes[item.id] === 'raw' ? (
                          <p className="text-sm text-gray-700 font-mono whitespace-pre-line leading-relaxed"><span className="font-bold text-medical-dark block mb-2 font-sans tracking-wide uppercase text-xs">Raw OCR Transcription:</span>{item.raw_ocr_text}</p>
                        ) : (
                          <p className="text-sm text-medical-dark font-medium whitespace-pre-line"><span className="font-bold text-medical-dark block mb-1 tracking-wide uppercase text-xs">AI Summary:</span>{item.ai_extracted_data}</p>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              </div>

            {/* Upload Column */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-medical-dark flex items-center gap-2"><Upload size={24} /> Upload Records</h2>
              
              <motion.div 
                whileHover={{ y: -2 }}
                className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100"
              >
                <form onSubmit={handleUpload} className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/webp"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    <FileText size={40} className="mx-auto mb-3 text-gray-400" />
                    <p className="font-semibold text-gray-700">Drop prescription here</p>
                    <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP (For AI Vision)</p>
                  </div>
                  
                  {file && <p className="text-sm text-green-600 font-medium text-center break-all">{file.name}</p>}

                  <button 
                    disabled={!file || isUploading}
                    className="w-full bg-medical-blue text-white py-3 rounded-xl font-bold shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUploading ? 'Analyzing with AI...' : 'Upload Document'}
                  </button>
                </form>
              </motion.div>


              
              {/* Security Setup */}
              <TwoFactorSetup />
            </div>
          </div>
        )}
        </div>
      </main>
      {/* Remove Medication Confirmation Modal */}
      {showRemoveModal && medicineToRemove && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 text-gray-800"
          >
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Pill className="text-red-500 animate-pulse" /> Remove Medication?
            </h3>
            <p className="text-gray-600 mb-6 text-sm">
              Are you sure you want to remove <strong>{medicineToRemove.name}</strong> from your daily medication reminders?
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => {
                  setShowRemoveModal(false);
                  setMedicineToRemove(null);
                }}
                disabled={isRemoving}
                className="px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={confirmRemoveMedicine}
                disabled={isRemoving}
                className="px-5 py-2 bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400 rounded-xl font-bold transition-colors text-sm flex items-center gap-2 shadow-lg shadow-red-600/20"
              >
                {isRemoving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : 'Remove'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Original Document Lightbox Modal */}
      {showDocModal && selectedDoc && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-6 max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 text-gray-800"
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Original Prescription Document</h3>
                <p className="text-xs text-gray-500">{new Date(selectedDoc.created_at).toLocaleString()}</p>
              </div>
              <button 
                onClick={() => { setShowDocModal(false); setSelectedDoc(null); }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-gray-900 rounded-2xl p-4 flex items-center justify-center min-h-[350px]">
              {selectedDoc.file_url?.startsWith('data:application/pdf') ? (
                <iframe src={getFileUrl(selectedDoc.file_url)} className="w-full h-[500px] rounded-xl" />
              ) : (
                <img 
                  src={getFileUrl(selectedDoc.file_url)} 
                  alt="Prescription Document" 
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg" 
                />
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-100">
              <a 
                href={getFileUrl(selectedDoc.file_url)} 
                download={`prescription_${selectedDoc.id}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-medical-blue text-white rounded-xl font-bold text-sm shadow-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                Open / Download Original
              </a>
              <button 
                onClick={() => { setShowDocModal(false); setSelectedDoc(null); }}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
