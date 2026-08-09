'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Clock, FileText, Settings, QrCode, Pill, CheckCircle2, Trash2, ShieldAlert, Ban, Activity, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TwoFactorSetup from '../../components/TwoFactorSetup';
import GoogleTranslate from '../../components/GoogleTranslate';
import CitizenSidebar from '../../components/CitizenSidebar';

export default function CitizenDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeMedicines, setActiveMedicines] = useState<any[]>([]);
  const [takenMeds, setTakenMeds] = useState<number[]>([]);
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

        // Combine medicines from all prescriptions
        const allMedicines: any[] = [];
        const uniqueMedKeys = new Set<string>();
        timelineData.forEach((t: any) => {
          if (t.medicines && t.medicines !== "[]" && t.medicines !== "null") {
            try {
              const meds = JSON.parse(t.medicines);
              if (Array.isArray(meds)) {
                meds.forEach((med: any) => {
                  const medKey = `${med.name.trim().toLowerCase()}-${(med.frequency || '').trim().toLowerCase()}`;
                  if (!uniqueMedKeys.has(medKey)) {
                    uniqueMedKeys.add(medKey);
                    allMedicines.push({ ...med, prescriptionId: t.id });
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
            <div className="bg-medical-dark p-2 rounded-xl shadow-lg border border-gray-100">
               <GoogleTranslate />
            </div>
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
                <div className="bg-gradient-to-r from-medical-blue to-blue-600 rounded-3xl p-6 text-white shadow-xl">
                  <h2 className="text-xl font-bold flex items-center gap-2 mb-4"><Pill size={24} /> Active Medication Reminders</h2>
                  <div className="space-y-3">
                    {activeMedicines.map((med: any, idx: number) => (
                      <div key={idx} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center justify-between border border-white/20">
                        <div>
                          <h3 className={`font-bold text-lg ${takenMeds.includes(idx) ? 'line-through text-gray-300' : ''}`}>{med.name}</h3>
                          <p className="text-blue-100 text-sm">{med.frequency} • {med.duration}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setTakenMeds(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${
                              takenMeds.includes(idx) 
                                ? 'bg-green-500 text-white' 
                                : 'bg-white text-medical-blue hover:bg-blue-50'
                            }`}
                          >
                            <CheckCircle2 size={18} /> {takenMeds.includes(idx) ? 'Taken' : 'Take'}
                          </button>
                          <button 
                            onClick={() => {
                              setMedicineToRemove(med);
                              setShowRemoveModal(true);
                            }}
                            className="p-2 bg-red-500/20 hover:bg-red-500/40 hover:scale-105 text-white rounded-lg transition-all"
                            title="Remove Medication"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h2 className="text-xl font-bold text-medical-dark flex items-center gap-2"><Clock size={24} /> Medical Timeline</h2>
              
              <div className="space-y-4">
                {timeline.length === 0 ? (
                   <p className="text-gray-500 italic p-6 bg-white rounded-2xl border border-gray-100 shadow-sm text-center">No prescriptions uploaded yet. Use the tool on the right to upload your first record!</p>
                ) : (
                  timeline.map((item) => (
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
