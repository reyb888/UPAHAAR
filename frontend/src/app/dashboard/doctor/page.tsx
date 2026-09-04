'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Scan, Search, User, Clock, Shield, LogOut, CheckCircle, AlertCircle, Phone, Pill, BrainCircuit, Camera, Zap, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';
import TwoFactorSetup from '../../components/TwoFactorSetup';
import VitalChart from '../../components/VitalChart';
import DoctorSidebar from '../../components/DoctorSidebar';
import { getMedicationDurationInfo, getMedicationKey } from '../../utils/medicationUtils';

export default function DoctorDashboard() {
  const [upahaarId, setUpahaarId] = useState('');
  const [patientData, setPatientData] = useState<any>(null);
  
  // Advanced Access State
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [isWaitingFor3sLoading, setIsWaitingFor3sLoading] = useState(false);
  const [tempPatientData, setTempPatientData] = useState<any>(null);
  const [isAccessDenied, setIsAccessDenied] = useState(false);
  const [activeMedicines, setActiveMedicines] = useState<any[]>([]);
  
  // AI Search State
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResult, setAiSearchResult] = useState<string | null>(null);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewModes, setViewModes] = useState<Record<string, 'summary' | 'raw'>>({});

  // Document Modal State
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showDocModal, setShowDocModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [pendingPatientName, setPendingPatientName] = useState('');
  const [pendingPatientId, setPendingPatientId] = useState('');

  const getFileUrl = (url?: string) => {
    if (!url) return '#';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const parseAllergies = (allergiesData: any) => {
    if (!allergiesData) return 'None reported';
    try {
      const parsed = typeof allergiesData === 'string' ? JSON.parse(allergiesData) : allergiesData;
      const active = Object.keys(parsed).filter(k => k !== 'other' && parsed[k]);
      if (parsed.other) active.push(parsed.other);
      return active.length > 0 ? active.join(', ') : 'None reported';
    } catch {
      return 'None reported';
    }
  };

  const parseEmergencyContacts = (contactsData: any) => {
    if (!contactsData) return [];
    try {
      const parsed = typeof contactsData === 'string' ? JSON.parse(contactsData) : contactsData;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parseFamilyHistory = (historyData: any) => {
    if (!historyData) return [];
    try {
      const parsed = typeof historyData === 'string' ? JSON.parse(historyData) : historyData;
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object' && parsed.relation && parsed.relation !== 'None') return [parsed];
      return [];
    } catch {
      return [];
    }
  };

  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<any>(null);

  // Face Scanner State
  const [isFaceScanning, setIsFaceScanning] = useState(false);
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isPendingApproval && requestId) {
      const pollStatus = async () => {
        try {
          const token = localStorage.getItem('upahaar_token');
          const response = await fetch(`/api/doctors/access-status/${requestId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          
          if (response.ok) {
            if (data.status === 'APPROVED') {
              setIsPendingApproval(false);
              setRequestId(null);
              
              // Store session tracking info
              setActiveLogId(data.log_id);
              sessionStorage.setItem('active_log_id', data.log_id || '');
              
              // Trigger 3-second loading transition
              setIsWaitingFor3sLoading(true);
              setTempPatientData(data);

              // Process medicines
              const timelineData = data.timeline || [];
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
                          if (durationInfo.isActive) {
                            allMedicines.push({ ...med, durationInfo });
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

              // Render profile after 3 seconds
              setTimeout(() => {
                setPatientData(data);
                setIsWaitingFor3sLoading(false);
                setTempPatientData(null);
              }, 3000);

            } else if (data.status === 'REVOKED') {
              setIsPendingApproval(false);
              setRequestId(null);
              setIsAccessDenied(true);
              setError("Access request was denied/revoked by the patient.");
            }
          } else if (response.status === 401) {
            // Token expired - redirect to login
            localStorage.removeItem('upahaar_token');
            sessionStorage.clear();
            window.location.href = '/auth/doctor/login';
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      };
      
      interval = setInterval(pollStatus, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPendingApproval, requestId]);



  const startScanner = () => {
    setIsScanning(true);
    setError(null);
    setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && (window as any).Html5QrcodeScanner) {
          const scanner = new (window as any).Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );
          
          codeReaderRef.current = scanner;
          
          scanner.render(
            (decodedText: string) => {
              setUpahaarId(decodedText);
              scanner.clear();
              setIsScanning(false);
              fetchPatientData(decodedText, 'qr');
            },
            (err: any) => {
              // ignore
            }
          );
        } else {
          setError("Scanner library not loaded yet. Try again in a moment.");
          setIsScanning(false);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to start camera. Please type the ID manually.");
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    setIsScanning(false);
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.clear();
      } catch(e) {}
    }
  };

  const startFaceScanner = async () => {
    setIsFaceScanning(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied.");
      setIsFaceScanning(false);
    }
  };

  const stopFaceScanner = () => {
    setIsFaceScanning(false);
    const stream = faceVideoRef.current?.srcObject as MediaStream;
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  const captureAndScanFace = async () => {
    if (!faceVideoRef.current || !canvasRef.current) return;
    const video = faceVideoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    
    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    stopFaceScanner();
    
    setLoading(true);
    setError(null);
    setPatientData(null);
    
    try {
      const token = localStorage.getItem('upahaar_token');
      const response = await fetch(`/api/doctors/scan-face`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image })
      });
      const data = await response.json();
      
      if (response.ok && data.upahaar_id) {
        setUpahaarId(data.upahaar_id);
        setIsPendingApproval(true);
        setRequestId(data.request_id);
        setPendingPatientName(data.full_name || 'Patient');
        setPendingPatientId(data.upahaar_id);
        setLoading(false);
      } else {
        setError(data.message || "Face not recognized in database.");
        setLoading(false);
      }
    } catch (err) {
      setError("AI connection error.");
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (upahaarId.trim()) fetchPatientData(upahaarId.trim());
  };

  const closeActiveSession = async () => {
    const logId = activeLogId || sessionStorage.getItem('active_log_id');
    if (logId) {
      const token = localStorage.getItem('upahaar_token');
      try {
        await fetch(`/api/doctors/close-access`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ log_id: logId })
        });
      } catch (e) {
        console.error("Failed to close session:", e);
      }
      setActiveLogId(null);
      sessionStorage.removeItem('active_log_id');
    }
  };

  const handleClearPatient = async () => {
    await closeActiveSession();
    setPatientData(null);
    setUpahaarId('');
    setActiveMedicines([]);
    setIsAccessDenied(false);
    sessionStorage.removeItem('active_patient_id');
  };

  const fetchPatientData = async (id: string, source: 'manual' | 'qr' | 'face' = 'manual') => {
    setLoading(true);
    setError(null);
    setPatientData(null);
    setIsPendingApproval(false);
    setRequestId(null);
    setIsAccessDenied(false);

    // Close previous session
    await closeActiveSession();

    const token = localStorage.getItem('upahaar_token');
    
    try {
      const response = await fetch(`/api/doctors/scan/${id}?source=${source}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        if (data.status === 'PENDING') {
          setIsPendingApproval(true);
          setRequestId(data.request_id);
          setPendingPatientName(data.patient.full_name);
          setPendingPatientId(data.patient.upahaar_id);
        } else {
          setPatientData(data);
          setActiveLogId(data.log_id);
          // Store session tracking info - only if we have valid data
          if (data.log_id) {
            sessionStorage.setItem('active_log_id', data.log_id);
          }
          if (id) {
            sessionStorage.setItem('active_patient_id', id);
          }
          
          // Combine medicines from all prescriptions
          const timelineData = data.timeline || [];
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
                      if (durationInfo.isActive) {
                        allMedicines.push({ ...med, durationInfo });
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
        }
      } else if (response.status === 401) {
        // Token expired - redirect to login
        localStorage.removeItem('upahaar_token');
        sessionStorage.clear();
        window.location.href = '/auth/doctor/login';
      } else {
        setError(data.message || "Failed to fetch patient data.");
        sessionStorage.removeItem('active_patient_id');
      }
    } catch (err) {
      setError("Server connection error.");
      sessionStorage.removeItem('active_patient_id');
    } finally {
      setLoading(false);
    }
  };

  // Restore active patient on mount (survives page refresh) + cleanup scanners on unmount
  useEffect(() => {
    const savedPatientId = sessionStorage.getItem('active_patient_id');
    const savedLogId = sessionStorage.getItem('active_log_id');
    if (savedLogId) {
      setActiveLogId(savedLogId);
    }
    if (savedPatientId) {
      setUpahaarId(savedPatientId);
      fetchPatientData(savedPatientId);
    }

    return () => {
      stopScanner();
      stopFaceScanner();
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [patientData?.patient?.upahaar_id]);

  useEffect(() => {
    if (patientData?.timeline?.length > 0) {
      const maxPage = Math.ceil(patientData.timeline.length / itemsPerPage);
      if (currentPage > maxPage) {
        setCurrentPage(maxPage);
      }
    }
  }, [patientData?.timeline?.length, currentPage]);


  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim() || !patientData) return;
    setAiSearchLoading(true);
    setAiSearchResult(null);
    try {
      const token = localStorage.getItem('upahaar_token');
      const response = await fetch(`/api/doctors/scan/${patientData.patient.upahaar_id}/ai-search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query: aiSearchQuery })
      });
      const data = await response.json();
      if (response.ok) {
        setAiSearchResult(data.summary);
      } else {
        setAiSearchResult("Error: " + data.message);
      }
    } catch (err) {
      setAiSearchResult("Failed to connect to AI service.");
    } finally {
      setAiSearchLoading(false);
    }
  };

  const totalPages = patientData?.timeline ? Math.ceil(patientData.timeline.length / itemsPerPage) : 0;
  const activePage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = patientData?.timeline ? Math.min(activePage * itemsPerPage, patientData.timeline.length) : 0;
  const paginatedTimeline = patientData?.timeline ? patientData.timeline.slice(startIndex, endIndex) : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <Script src="https://unpkg.com/html5-qrcode" strategy="lazyOnload" />
      <DoctorSidebar activePage="workspace" />

      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Doctor Workspace</h1>
              <p className="text-gray-500">Scan citizen QR code to view their medical timeline.</p>
            </div>
            <Shield className="text-medical-blue" size={32} />
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Scanner & Search */}
            <div className="lg:col-span-1 space-y-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                  <h3 className="font-bold text-lg mb-4 text-gray-800">Scan QR Code</h3>
                  
                  {isScanning ? (
                    <div className="space-y-4">
                       <div className="w-full bg-white rounded-xl overflow-hidden relative border-2 border-medical-blue">
                         <div id="qr-reader" className="w-full h-full"></div>
                       </div>
                       <button onClick={stopScanner} className="text-sm font-semibold text-red-500 hover:underline">Cancel Scan</button>
                    </div>
                  ) : (
                    <button 
                      onClick={startScanner}
                      className="w-full bg-medical-blue hover:bg-blue-700 text-white p-12 rounded-xl flex flex-col items-center justify-center gap-4 transition-all"
                    >
                      <Scan size={48} className="opacity-80" />
                      <span className="font-bold">Start Camera Scanner</span>
                    </button>
                  )}

                  <div className="relative py-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                    <div className="relative flex justify-center"><span className="bg-white px-4 text-sm text-gray-500 font-semibold uppercase tracking-wider">OR</span></div>
                  </div>

                  <form onSubmit={handleManualSearch} className="space-y-3">
                     <label className="block text-left text-sm font-semibold text-gray-700">Manual UPAHAAR ID</label>
                     <div className="flex gap-2">
                       <input 
                         type="text" 
                         placeholder="UPHR-123456" 
                         className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-medical-blue outline-none"
                         value={upahaarId}
                         onChange={(e) => setUpahaarId(e.target.value.toUpperCase())}
                       />
                       <button type="submit" disabled={loading} className="bg-gray-800 hover:bg-black text-white px-4 rounded-lg flex justify-center items-center"><Search size={18}/></button>
                     </div>
                  </form>
               </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                   <h3 className="font-bold text-lg mb-4 text-purple-800 flex justify-center items-center gap-2"><BrainCircuit size={20}/> AI Facial Recognition</h3>
                   
                   {isFaceScanning ? (
                     <div className="space-y-4">
                        <div className="w-full aspect-square bg-black rounded-xl overflow-hidden relative">
                          <video ref={faceVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          <canvas ref={canvasRef} className="hidden" />
                          <div className="absolute inset-0 border-[4px] border-purple-500/50 rounded-xl m-4 z-10 pointer-events-none"></div>
                        </div>
                        <button onClick={captureAndScanFace} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold transition-colors">Capture & Identify</button>
                        <button onClick={stopFaceScanner} className="text-sm font-semibold text-red-500 hover:underline block w-full">Cancel</button>
                     </div>
                   ) : (
                     <button 
                       onClick={startFaceScanner}
                       className="w-full bg-purple-100 hover:bg-purple-200 text-purple-700 p-8 rounded-xl flex flex-col items-center justify-center gap-3 transition-all"
                     >
                       <Camera size={40} className="opacity-80" />
                       <span className="font-bold">Scan Patient Face</span>
                     </button>
                   )}
                </div>
                
                {/* Security Setup */}
                <TwoFactorSetup />
            </div>

            {/* Right Column: Patient Data */}
            <div className="lg:col-span-2">
               {isWaitingFor3sLoading ? (
                 <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 p-10 rounded-2xl shadow-sm border border-emerald-100 flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                   <motion.div 
                     initial={{ scale: 0.8, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 border border-emerald-200 shadow-md shadow-emerald-100/50"
                   >
                     <CheckCircle size={32} />
                   </motion.div>
                   <h2 className="text-2xl font-extrabold text-gray-800 mb-1">Access Granted!</h2>
                   <p className="text-emerald-700 font-semibold text-sm mb-6">Synchronizing clinical history...</p>
                   
                   {/* Dual-gradient spinning loading wheel */}
                   <div className="relative flex items-center justify-center">
                     <div className="w-16 h-16 rounded-full border-4 border-t-transparent border-b-transparent border-l-emerald-500 border-r-indigo-500 animate-spin"></div>
                     <div className="absolute text-[10px] font-bold text-gray-400">3s</div>
                   </div>
                 </div>
               ) : isAccessDenied ? (
                 <div className="bg-gradient-to-br from-red-50 to-rose-50/30 p-10 rounded-2xl shadow-sm border border-red-100 flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                   <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6 border border-red-200 shadow-md shadow-red-100/50">
                     <AlertCircle size={32} className="text-red-500" />
                   </div>
                   <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Access Denied</h2>
                   <p className="text-gray-500 max-w-sm mb-8 leading-relaxed text-sm">
                     The patient has declined your access request or the access credentials have expired.
                   </p>
                   <button 
                     onClick={handleClearPatient}
                     className="px-6 py-2.5 bg-gray-800 hover:bg-black text-white font-bold rounded-xl transition-all shadow-md text-xs cursor-pointer"
                   >
                     Return to Workspace
                   </button>
                 </div>
               ) : isPendingApproval ? (
                 <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                   <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6 animate-pulse border border-amber-200">
                     <Clock size={32} className="text-amber-500" />
                   </div>
                   <h2 className="text-2xl font-bold text-gray-800 mb-2">Awaiting Patient Approval</h2>
                   <p className="text-gray-500 max-w-md mb-6">
                     Access request has been sent for patient <strong>{pendingPatientName}</strong> (<span className="font-mono">{pendingPatientId}</span>).
                   </p>
                   <div className="flex items-center gap-2 text-sm text-gray-400 font-semibold bg-gray-50 px-4 py-2 rounded-xl">
                     <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                     Polling approval status...
                   </div>
                   <button
                     onClick={handleClearPatient}
                     className="mt-8 text-sm text-red-500 font-semibold hover:underline"
                   >
                     Cancel Request
                   </button>
                 </div>
               ) : loading ? (
                 <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-full min-h-[400px]">
                   <div className="w-12 h-12 border-4 border-medical-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                   <p className="text-gray-500 font-semibold">Decrypting medical records...</p>
                 </div>
               ) : error ? (
                  <div className={`p-10 rounded-2xl shadow-sm border flex flex-col items-center justify-center h-full min-h-[400px] text-center ${
                    error.includes('Consent Revoked') || error.includes('declined') 
                      ? 'bg-gradient-to-br from-red-50 to-rose-50/30 border-red-100' 
                      : error.includes('not found') || error.includes('invalid')
                        ? 'bg-gradient-to-br from-amber-50 to-orange-50/30 border-amber-100'
                        : 'bg-gradient-to-br from-slate-50 to-gray-50/30 border-gray-200'
                  }`}>
                    <AlertCircle size={48} className={`mb-4 ${
                      error.includes('Consent Revoked') || error.includes('declined') ? 'text-red-400' 
                      : error.includes('not found') || error.includes('invalid') ? 'text-amber-400'
                      : 'text-gray-400'
                    }`} />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{
                      error.includes('Consent Revoked') || error.includes('declined') ? 'Access Denied'
                      : error.includes('not found') || error.includes('invalid') ? 'Patient Not Found'
                      : error.includes('connection') || error.includes('fetch') ? 'Connection Error'
                      : 'Request Failed'
                    }</h2>
                    <p className="text-gray-600 text-center max-w-sm text-sm leading-relaxed">{error}</p>
                    <button 
                      onClick={handleClearPatient}
                      className="mt-6 px-6 py-2.5 bg-gray-800 hover:bg-black text-white font-bold rounded-xl transition-all shadow-md text-xs cursor-pointer"
                    >
                      Return to Workspace
                    </button>
                  </div>
               ) : patientData ? (
                 <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    
                    {/* Access Source Banner */}
                    {patientData.method === 'QR_SCAN' ? (
                      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-2xl shadow-md text-white font-extrabold flex items-center gap-3 text-sm border border-purple-400/40">
                        <Zap size={18} className="shrink-0" />
                        <span>Emergency Access Granted via QR Code Scanner</span>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 rounded-2xl shadow-md text-white font-extrabold flex items-center gap-3 text-sm border border-emerald-400/40">
                        <ShieldCheck size={18} className="shrink-0" />
                        <span>Clinical Access Granted via Patient Authorization</span>
                      </div>
                    )}
                    
                    {/* Patient Overview */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-6">
                      <div className="flex flex-wrap gap-6 items-start">
                         {patientData.patient.face_photo_url && patientData.patient.face_photo_url !== 'dummy-url-for-now' ? (
                            <img 
                              src={getFileUrl(patientData.patient.face_photo_url)} 
                              alt="Patient Face Photo" 
                              className="w-20 h-20 rounded-full object-cover border-2 border-medical-blue shadow-md shrink-0" 
                            />
                         ) : (
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                               <User size={40} className="text-medical-blue" />
                            </div>
                         )}
                         <div className="flex-1 min-w-[200px]">
                            <h2 className="text-2xl font-bold text-gray-800">{patientData.patient.full_name}</h2>
                            <p className="text-gray-500 font-mono tracking-widest">{patientData.patient.upahaar_id}</p>
                            <div className="flex gap-4 mt-3">
                               <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
                                 Blood: {patientData.patient.blood_group || 'Unknown'}
                               </span>
                               <span className="flex items-center gap-1 text-sm text-gray-600 font-semibold">
                                  <Phone size={14} /> {patientData.patient.phone}
                               </span>
                            </div>
                         </div>
                         <div className="w-full lg:w-auto bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm min-w-[150px]">
                            <strong className="block text-gray-700 mb-1">Allergies</strong>
                            <p className="text-red-600 font-medium capitalize">{parseAllergies(patientData.patient.allergies)}</p>
                         </div>
                      </div>

                      {/* Emergency Contacts Row */}
                      {parseEmergencyContacts(patientData.patient.emergency_contacts).length > 0 && (
                        <div className="border-t pt-4">
                          <strong className="block text-xs uppercase tracking-wider text-red-600 mb-3">Emergency Contacts</strong>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {parseEmergencyContacts(patientData.patient.emergency_contacts).map((contact: any, idx: number) => (
                              <div key={idx} className="bg-red-50/50 p-3 rounded-xl border border-red-100 flex justify-between items-center text-sm">
                                <div>
                                  <span className="font-bold text-gray-800 block">{contact.name}</span>
                                  <span className="text-xs text-red-700 font-medium uppercase tracking-wider">{contact.relation}</span>
                                </div>
                                <a 
                                  href={`tel:${contact.phone}`} 
                                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors text-xs shadow-sm"
                                >
                                  <Phone size={14} /> {contact.phone}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Family Disease History Row */}
                      {parseFamilyHistory(patientData.patient.family_history).length > 0 && (
                        <div className="border-t pt-4">
                          <strong className="block text-xs uppercase tracking-wider text-indigo-700 mb-3">Family Disease History</strong>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {parseFamilyHistory(patientData.patient.family_history).map((fam: any, idx: number) => (
                              <div key={idx} className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 text-sm">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-bold text-gray-800">{fam.relation}</span>
                                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">{fam.disease || 'Unspecified'}</span>
                                </div>
                                {fam.notes && <p className="text-xs text-gray-600 italic">{fam.notes}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Active Medications (Ongoing) */}
                    {activeMedicines.length > 0 && (
                      <div className="bg-gradient-to-r from-medical-blue to-blue-600 p-6 rounded-2xl shadow-sm text-white">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Pill size={20} /> Ongoing Medications</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {activeMedicines.map((med, idx) => (
                              <div key={idx} className="bg-white/10 p-3 rounded-xl border border-white/20">
                                 <strong className="block text-lg">{med.name}</strong>
                                 <div className="flex flex-wrap items-center gap-2 mt-1">
                                   <span className="text-sm text-blue-100">{med.frequency}</span>
                                   <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white">{med.durationInfo?.statusText || med.duration}</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                      </div>
                    )}

                    {/* Vitals Graph */}
                    {patientData.vitals && (
                      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                         <h3 className="text-lg font-bold text-gray-800 mb-2">Patient Vitals History</h3>
                         <VitalChart vitals={patientData.vitals} />
                      </div>
                    )}

                    {/* AI Medical History Search */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl shadow-sm border border-indigo-100">
                      <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-indigo-900"><BrainCircuit size={20} className="text-indigo-600" /> AI Disease Search</h3>
                      <p className="text-sm text-indigo-700 mb-4">Search this patient's entire medical history for specific diseases or conditions. The AI will extract relevant incidents and prescribed medications.</p>
                      
                      <div className="flex gap-3 mb-4">
                        <input 
                          type="text" 
                          placeholder="e.g. Asthma, Diabetes, Knee Pain..." 
                          className="flex-1 p-3 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                          value={aiSearchQuery}
                          onChange={(e) => setAiSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAiSearch()}
                        />
                        <button 
                          onClick={handleAiSearch}
                          disabled={aiSearchLoading || !aiSearchQuery.trim()}
                          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          {aiSearchLoading ? 'Analyzing...' : 'Search History'}
                        </button>
                      </div>

                      {aiSearchResult && (
                        <div className="bg-white p-5 rounded-xl border border-indigo-200 shadow-sm mt-4">
                          <strong className="text-indigo-900 block mb-2 text-sm uppercase tracking-wide">AI Analysis Result:</strong>
                          <p className="text-gray-700 whitespace-pre-line leading-relaxed">{aiSearchResult}</p>
                        </div>
                      )}
                    </div>

                    {/* Timeline */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 font-sans">
                       <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Clock size={20} /> Historical Timeline</h3>
                       
                       {totalPages > 1 && (
                         <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm gap-4 mb-6">
                           <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                             Showing <span className="font-bold text-gray-800 dark:text-white">{startIndex + 1}</span> - <span className="font-bold text-gray-800 dark:text-white">{endIndex}</span> of <span className="font-bold text-gray-800 dark:text-white">{patientData.timeline.length}</span> prescriptions
                           </div>
                           <div className="flex items-center gap-1.5 font-sans">
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

                       <div className="space-y-4 pl-4 border-l-2 border-medical-blue/20">
                          {patientData.timeline.length === 0 ? (
                            <p className="text-gray-500 italic ml-4">No historical records available for this patient.</p>
                          ) : (
                            paginatedTimeline.map((record: any) => (
                              <div key={record.id} className="relative pl-6 pb-6 last:pb-0">
                                <div className="absolute left-[-21px] top-1 bg-medical-blue text-white rounded-full p-1 border-4 border-white shadow-sm">
                                  <CheckCircle size={14} />
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-800">Prescription Upload</h4>
                                    <span className="text-xs font-bold text-gray-500">{new Date(record.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex justify-between items-center mb-3">
                                    <button 
                                      onClick={() => { setSelectedDoc(record); setShowDocModal(true); }}
                                      className="text-xs font-bold text-medical-blue hover:underline cursor-pointer"
                                    >
                                      View Original File
                                    </button>
                                    {record.raw_ocr_text && (
                                      <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                                        <button 
                                          onClick={() => setViewModes(prev => ({ ...prev, [record.id]: 'summary' }))}
                                          className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${viewModes[record.id] !== 'raw' ? 'bg-medical-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >AI Summary</button>
                                        <button 
                                          onClick={() => setViewModes(prev => ({ ...prev, [record.id]: 'raw' }))}
                                          className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors ${viewModes[record.id] === 'raw' ? 'bg-medical-blue text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >Original OCR</button>
                                      </div>
                                    )}
                                  </div>
                                  
                                  {viewModes[record.id] === 'raw' ? (
                                    <p className="text-sm text-gray-700 whitespace-pre-line bg-white p-3 rounded-lg border border-gray-200 font-mono leading-relaxed"><span className="font-bold text-medical-dark block mb-2 font-sans tracking-wide uppercase text-[10px]">Raw OCR Transcription:</span>{record.raw_ocr_text}</p>
                                  ) : (
                                    <p className="text-sm text-gray-700 whitespace-pre-line bg-white p-3 rounded-lg border border-gray-200"><span className="font-bold text-medical-dark block mb-1 tracking-wide uppercase text-[10px]">AI Diagnosis & Medicines:</span>{record.ai_extracted_data}</p>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                       </div>
                    </div>

                 </motion.div>
               ) : (
                 <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                   <Shield size={64} className="text-gray-200 mb-4" />
                   <h2 className="text-xl font-bold text-gray-400 mb-2">Awaiting Scan</h2>
                   <p className="text-gray-400">Scan a patient's QR code or enter their ID manually to securely view their medical records.</p>
                 </div>
               )}
            </div>

          </div>
        </div>
      </main>

      {/* Document Lightbox Modal for Doctor */}
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
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
              >
                ✕
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
