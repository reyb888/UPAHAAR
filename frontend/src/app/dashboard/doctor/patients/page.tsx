'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, User, Activity, Pill, Clock, ShieldCheck, 
  BrainCircuit, AlertTriangle, FileText, ChevronRight, 
  Phone, Mail, Heart, Eye, Users, ChevronDown, CheckCircle2, RefreshCw, Bell, Shield, X, Ban, Lock
} from 'lucide-react';
import DoctorSidebar from '../../../components/DoctorSidebar';
import VitalChart from '../../../components/VitalChart';

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedPatientData, setSelectedPatientData] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [manualInputId, setManualInputId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Open State
  const [showProfileModal, setShowProfileModal] = useState(false);

  // AI Search state for selected patient
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchResult, setAiSearchResult] = useState<string | null>(null);
  const [aiSearchLoading, setAiSearchLoading] = useState(false);

  // OCR raw view toggle
  const [viewModes, setViewModes] = useState<Record<string, 'summary' | 'raw'>>({});

  const getFileUrl = (url?: string) => {
    if (!url) return '#';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const parseJsonData = (data: any, fallback: any = {}) => {
    if (!data) return fallback;
    try {
      return typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return fallback;
    }
  };

  const parseAllergies = (allergiesData: any) => {
    if (!allergiesData) return [];
    try {
      const parsed = typeof allergiesData === 'string' ? JSON.parse(allergiesData) : allergiesData;
      const list = Object.keys(parsed).filter(k => k !== 'other' && parsed[k]);
      if (parsed.other) list.push(parsed.other);
      return list;
    } catch {
      return [];
    }
  };

  const fetchAccessiblePatients = async () => {
    setLoadingList(true);
    const token = localStorage.getItem('upahaar_token');
    if (!token) return;
    try {
      const response = await fetch('/api/doctors/accessible-patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (err) {
      console.error('Failed to fetch accessible patients:', err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchPatientDetail = async (upahaarId: string) => {
    if (!upahaarId) return;
    setSelectedPatientId(upahaarId);
    setLoadingDetail(true);
    setAiSearchResult(null);
    setAiSearchQuery('');

    const token = localStorage.getItem('upahaar_token');
    try {
      const response = await fetch(`/api/doctors/patient-details/${upahaarId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedPatientData(data);
      } else {
        const errData = await response.json();
        alert(errData.message || "Access revoked or session expired for this patient.");
        setShowProfileModal(false);
      }
    } catch (err) {
      console.error('Failed to fetch patient detail:', err);
      setShowProfileModal(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenProfile = (upahaarId: string) => {
    if (!upahaarId) return;
    setShowProfileModal(true);
    fetchPatientDetail(upahaarId);
  };

  useEffect(() => {
    fetchAccessiblePatients();
  }, []);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInputId.trim()) {
      handleOpenProfile(manualInputId.trim().toUpperCase());
    }
  };

  const handleAiSearch = async () => {
    if (!aiSearchQuery.trim() || !selectedPatientId) return;
    setAiSearchLoading(true);
    setAiSearchResult(null);
    try {
      const token = localStorage.getItem('upahaar_token');
      const response = await fetch(`/api/doctors/scan/${selectedPatientId}/ai-search`, {
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
        setAiSearchResult("Error: " + (data.message || "Failed to search history"));
      }
    } catch (err) {
      setAiSearchResult("Failed to connect to AI processing server.");
    } finally {
      setAiSearchLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => 
    (p.full_name && p.full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.upahaar_id && p.upahaar_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const patient = selectedPatientData?.patient;
  const timeline = selectedPatientData?.timeline || [];
  const vitals = selectedPatientData?.vitals || [];
  const notifications = selectedPatientData?.notifications || [];

  const allergiesList = parseAllergies(patient?.allergies);
  const emergencyContacts = parseJsonData(patient?.emergency_contacts, []);
  const familyHistory = parseJsonData(patient?.family_history, []);
  const mentalHealth = parseJsonData(patient?.mental_health, {});
  const respiratoryDisorders = parseJsonData(patient?.respiratory_disorders, {});
  const heartProblems = parseJsonData(patient?.heart_problems, {});
  const nervousDisorders = parseJsonData(patient?.nervous_disorders, {});

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300 overflow-x-hidden">
      <DoctorSidebar activePage="patients" />

      <main className="flex-1 p-6 lg:p-10 flex flex-col gap-6 max-w-6xl mx-auto w-full">
        
        {/* Header Ribbon Card */}
        <header className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Users size={24} className="text-medical-blue dark:text-blue-400" /> Patient Access Repository
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Inspect accessible patient cards, review shared health scopes, and view active medical records.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500" size={18} />
              <input 
                type="text"
                placeholder="Filter repository..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-850 dark:text-white outline-none focus:ring-2 focus:ring-medical-blue text-xs transition-all placeholder-gray-400 dark:placeholder-gray-500"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button 
              onClick={fetchAccessiblePatients}
              className="p-2.5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-2xl text-gray-600 dark:text-gray-300 hover:text-medical-blue transition-colors shadow-sm cursor-pointer"
              title="Refresh Repository"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        {/* Manual Lookup Direct Form */}
        <form onSubmit={handleManualSearch} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center gap-3">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider shrink-0">Look up Patient ID:</span>
          <input 
            type="text"
            placeholder="e.g. UPHR-8456635162"
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-850 dark:text-white outline-none text-xs uppercase font-mono"
            value={manualInputId}
            onChange={e => setManualInputId(e.target.value)}
          />
          <button 
            type="submit"
            className="bg-medical-blue hover:bg-blue-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors shrink-0 cursor-pointer"
          >
            Open Patient Profile
          </button>
        </form>

        {/* Repository Cards Grid */}
        <div>
          <h3 className="text-xs font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
            Patient Access Repository ({filteredPatients.length})
          </h3>

          {loadingList ? (
            <div className="bg-white dark:bg-slate-900 p-16 rounded-3xl border border-gray-100 dark:border-slate-800 text-center">
              <div className="w-10 h-10 border-4 border-medical-blue dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm">Loading patient access repository...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-16 rounded-3xl border border-gray-100 dark:border-slate-800 text-center shadow-sm space-y-3">
              <User size={48} className="mx-auto text-gray-300 dark:text-slate-700 mb-2" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">No Patient Records Found</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                No patient access logs match your filter. Look up a patient by UPAHAAR ID above or scan a patient's QR code.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPatients.map((p) => {
                const methodLabel = p.method === 'QR_SCAN' 
                  ? 'QR Code' 
                  : p.method === 'FACE_SCAN' 
                  ? 'Facial Recognition' 
                  : 'Manual Lookup';

                const isRevokedOrExpired = p.access_status === 'REVOKED' || p.access_status === 'LOGGED_OUT' || p.logged_out_at !== null;
                const isPending = p.access_status === 'PENDING';
                const isActive = (p.access_status === 'APPROVED' || p.access_status === 'ACKNOWLEDGED' || p.access_status === 'QR_SCAN') && !p.logged_out_at;
                const displayName = p.full_name || `Patient (${p.upahaar_id})`;

                let cardBgClass = "bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800";
                let statusBadgeClass = "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300";
                let statusBadgeText = "No Active Access";

                if (isActive) {
                  cardBgClass = "bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200 dark:from-emerald-950/30 dark:to-slate-900 dark:border-emerald-500/40 shadow-sm";
                  statusBadgeClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
                  statusBadgeText = "Access Granted";
                } else if (isRevokedOrExpired) {
                  cardBgClass = "bg-gradient-to-br from-red-50/30 to-white border-red-200 dark:from-red-950/30 dark:to-slate-900 dark:border-red-500/30";
                  statusBadgeClass = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
                  statusBadgeText = p.method === 'QR_SCAN' ? "Emergency Access Expired" : "Access Revoked";
                } else if (isPending) {
                  cardBgClass = "bg-gradient-to-br from-amber-50/30 to-white border-amber-200 dark:from-amber-950/30 dark:to-slate-900 dark:border-amber-500/30";
                  statusBadgeClass = "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300";
                  statusBadgeText = "Pending Approval";
                }

                return (
                  <motion.div
                    key={p.citizen_user_id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300 relative ${cardBgClass}`}
                  >
                    <div>
                      {/* Top Patient Avatar & ID Block */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3.5">
                          {p.face_photo_url && p.face_photo_url !== 'dummy-url-for-now' ? (
                            <img 
                              src={getFileUrl(p.face_photo_url)} 
                              alt={displayName} 
                              className="w-12 h-12 rounded-full object-cover border-2 border-medical-blue/20 shadow-sm shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-blue-50 dark:bg-slate-800 text-medical-blue dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-base shrink-0 border border-blue-100 dark:border-slate-700">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <h4 className="font-bold text-gray-800 dark:text-white text-base leading-snug">
                              {displayName}
                            </h4>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                              UPAHAAR ID: <span className="font-semibold text-gray-700 dark:text-gray-300">{p.upahaar_id}</span>
                            </p>
                            {p.method && (
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                                <Eye size={13} className="text-gray-400" /> Requested via {methodLabel}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Middle Details Block */}
                      <div className="space-y-2.5 py-4 border-t border-b border-gray-100 dark:border-slate-800 my-4 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Clock size={14} className="text-gray-400 dark:text-gray-500" /> Date requested
                          </span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {p.last_accessed_at ? new Date(p.last_accessed_at).toLocaleString() : 'Registered Citizen'}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-gray-400 dark:text-gray-500" /> Data Shared
                          </span>
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            Timeline • Meds • Vitals
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                            <Shield size={14} className="text-gray-400 dark:text-gray-500" /> Status Badge
                          </span>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${statusBadgeClass}`}>
                            {statusBadgeText}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs font-semibold flex items-center gap-1">
                        {isActive ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 size={14} /> Allowed
                          </span>
                        ) : isRevokedOrExpired ? (
                          <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                            <Ban size={14} /> Access Revoked
                          </span>
                        ) : isPending ? (
                          <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Clock size={14} /> Pending Approval
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Lock size={14} /> No Active Access
                          </span>
                        )}
                      </span>

                      {/* Primary Action Button: ONLY SHOWN FOR ACTIVE GRANTED ACCESS */}
                      {isActive ? (
                        <button
                          onClick={() => handleOpenProfile(p.upahaar_id)}
                          className="px-4 py-2 bg-medical-blue hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-sm text-xs cursor-pointer flex items-center gap-1.5"
                        >
                          View Medical Profile <ChevronRight size={14} />
                        </button>
                      ) : isRevokedOrExpired ? (
                        <span className="px-3.5 py-1.5 bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold rounded-xl text-xs border border-red-200 dark:border-red-800/40">
                          Access Revoked
                        </span>
                      ) : isPending ? (
                        <span className="px-3.5 py-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold rounded-xl text-xs border border-amber-200 dark:border-amber-800/40">
                          Awaiting Consent
                        </span>
                      ) : (
                        <span className="px-3.5 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-bold rounded-xl text-xs border border-gray-200 dark:border-slate-700">
                          Scan QR Code
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </main>

      {/* Patient Medical Profile Modal Pop-up - Clean Vertical Scrolling */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 lg:p-6 overflow-x-hidden">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[92vh]"
            >
              {/* Modal Top Header Bar */}
              <div className="bg-medical-dark text-white p-5 px-6 flex justify-between items-center shrink-0 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <User className="text-medical-blue shrink-0" size={24} />
                  <div>
                    <h3 className="font-bold text-base text-white">
                      {patient ? `${patient.full_name}'s Medical Profile` : 'Patient Profile'}
                    </h3>
                    <p className="text-xs text-gray-300 font-mono">
                      UPAHAAR ID: {selectedPatientId}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-colors cursor-pointer"
                  title="Close Profile"
                >
                  <X size={22} />
                </button>
              </div>

              {/* Modal Vertical Body */}
              <div className="p-6 lg:p-8 overflow-y-auto space-y-6 flex-1 scrollbar-thin overflow-x-hidden">
                {loadingDetail ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-blue mx-auto"></div>
                    <p className="text-gray-500 dark:text-gray-400 font-semibold text-sm">Loading complete medical record...</p>
                  </div>
                ) : patient ? (
                  <div className="space-y-6">

                    {/* 1. Patient Header Card */}
                    <div className="bg-gray-50 dark:bg-slate-800/60 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                      <div className="flex items-center gap-5">
                        {patient.face_photo_url && patient.face_photo_url !== 'dummy-url-for-now' ? (
                          <img 
                            src={getFileUrl(patient.face_photo_url)} 
                            alt={patient.full_name} 
                            className="w-20 h-20 rounded-full object-cover border-4 border-medical-blue/30 shadow-md shrink-0"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-medical-blue/10 dark:bg-blue-950/60 text-medical-blue dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-3xl border border-medical-blue/20 shrink-0">
                            {patient.full_name ? patient.full_name.charAt(0).toUpperCase() : 'P'}
                          </div>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h2 className="text-2xl font-extrabold text-gray-850 dark:text-white">{patient.full_name}</h2>
                            <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Access Granted
                            </span>
                          </div>

                          <p className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                            UPAHAAR ID: <span className="text-medical-blue dark:text-blue-400">{patient.upahaar_id}</span>
                          </p>

                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 pt-1 flex-wrap">
                            {patient.email && (
                              <span className="flex items-center gap-1"><Mail size={14} className="text-gray-400" /> {patient.email}</span>
                            )}
                            {patient.phone && (
                              <span className="flex items-center gap-1"><Phone size={14} className="text-gray-400" /> {patient.phone}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick Health Stats Pills */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                        <div className="bg-red-50 dark:bg-red-950/50 border border-red-100 dark:border-red-900/40 p-3 rounded-2xl text-center">
                          <span className="block text-[10px] font-extrabold text-red-600 dark:text-red-400 uppercase tracking-wider">Blood Group</span>
                          <span className="text-lg font-bold text-red-700 dark:text-red-300">{patient.blood_group || 'N/A'}</span>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/40 p-3 rounded-2xl text-center">
                          <span className="block text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Height</span>
                          <span className="text-lg font-bold text-blue-700 dark:text-blue-300">{patient.height_cm ? `${patient.height_cm} cm` : 'N/A'}</span>
                        </div>

                        <div className="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/40 p-3 rounded-2xl text-center">
                          <span className="block text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Weight</span>
                          <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{patient.weight_kg ? `${patient.weight_kg} kg` : 'N/A'}</span>
                        </div>

                        <div className="bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-2xl text-center">
                          <span className="block text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Records</span>
                          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{timeline.length}</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. AI Clinical Assistant - PLACED FIRST BELOW HEADER */}
                    <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 p-6 lg:p-8 rounded-3xl text-white shadow-lg space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-500/20 rounded-2xl backdrop-blur-md border border-purple-400/30">
                          <BrainCircuit size={28} className="text-purple-300" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">AI Clinical Assistant</h3>
                          <p className="text-xs text-purple-200">Query this patient's documented history using natural language</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="e.g. Has this patient ever taken antibiotics or experienced asthma symptoms?"
                          className="flex-1 px-4 py-3.5 rounded-2xl border border-purple-400/30 bg-white/10 text-white placeholder-purple-200/60 outline-none text-xs focus:ring-2 focus:ring-purple-400 backdrop-blur-md"
                          value={aiSearchQuery}
                          onChange={e => setAiSearchQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAiSearch()}
                        />
                        <button
                          onClick={handleAiSearch}
                          disabled={aiSearchLoading}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3.5 rounded-2xl text-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                        >
                          {aiSearchLoading ? 'Analyzing...' : 'Search History'}
                        </button>
                      </div>

                      {aiSearchResult && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white/10 backdrop-blur-md border border-white/15 p-5 rounded-2xl text-xs leading-relaxed text-purple-50 space-y-2"
                        >
                          <span className="font-bold text-purple-200 block text-sm">AI Diagnostic Summary:</span>
                          <div className="whitespace-pre-line text-sm font-light">{aiSearchResult}</div>
                        </motion.div>
                      )}
                    </div>

                    {/* 3. Prescriptions & Medical Timeline */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-slate-800 space-y-6">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                        <h3 className="text-xl font-bold text-gray-850 dark:text-white flex items-center gap-2">
                          <FileText className="text-medical-blue" size={22} /> Prescriptions & Medical Timeline
                        </h3>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {timeline.length} Records Uploaded
                        </span>
                      </div>

                      {timeline.length === 0 ? (
                        <div className="text-center p-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
                          <FileText size={32} className="mx-auto text-gray-400 dark:text-gray-600" />
                          <h4 className="font-bold text-gray-800 dark:text-white text-base">No medical prescriptions uploaded yet</h4>
                          <p className="text-xs max-w-sm mx-auto">
                            This patient has not uploaded any prescription receipts or medical records to their timeline yet.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {timeline.map((record: any) => {
                            const isRaw = viewModes[record.id] === 'raw';
                            let medicines: any[] = [];
                            try {
                              medicines = typeof record.medicines === 'string' ? JSON.parse(record.medicines) : (record.medicines || []);
                            } catch (e) {}

                            return (
                              <div key={record.id} className="bg-gray-50/80 dark:bg-slate-800/70 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-4 shadow-sm">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                      {new Date(record.created_at).toLocaleDateString()} at {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {record.is_fraudulent === 1 && (
                                      <span className="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                        <AlertTriangle size={11} /> Flagged
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    onClick={() => setViewModes({ ...viewModes, [record.id]: isRaw ? 'summary' : 'raw' })}
                                    className="text-xs font-bold text-medical-blue dark:text-blue-400 hover:underline cursor-pointer"
                                  >
                                    {isRaw ? 'Show AI Summary' : 'View OCR Text'}
                                  </button>
                                </div>

                                {isRaw ? (
                                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {record.raw_ocr_text || 'No raw text available'}
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white leading-relaxed">
                                      {record.ai_extracted_data || 'Medical Record'}
                                    </p>

                                    {medicines.length > 0 && (
                                      <div className="space-y-2">
                                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Prescribed Medications:</span>
                                        <div className="flex flex-wrap gap-2">
                                          {medicines.map((med: any, mIdx: number) => (
                                            <div key={mIdx} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 text-gray-800 dark:text-white">
                                              <Pill size={14} className="text-medical-blue dark:text-blue-400" />
                                              <span className="font-bold">{med.name}</span>
                                              {med.frequency && <span className="text-gray-400">• {med.frequency}</span>}
                                              {med.duration && <span className="text-gray-400">• {med.duration}</span>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 4. Vital Tracker & Trends */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
                      <h3 className="text-xl font-bold text-gray-850 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                        <Activity className="text-emerald-500" size={22} /> Vital Tracker & Trends
                      </h3>
                      {vitals.length === 0 ? (
                        <div className="text-center p-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
                          <Activity size={32} className="mx-auto text-gray-400 dark:text-gray-600" />
                          <h4 className="font-bold text-gray-800 dark:text-white text-base">No vitals logged yet</h4>
                          <p className="text-xs max-w-sm mx-auto">
                            Patient has not recorded heart rate, blood sugar, or blood pressure readings yet.
                          </p>
                        </div>
                      ) : (
                        <VitalChart vitals={vitals} />
                      )}
                    </div>

                    {/* 5. Allergies & Systemic Conditions (2 Grid Columns) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Allergies Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
                        <h3 className="text-lg font-bold text-gray-850 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                          <AlertTriangle className="text-amber-500" size={20} /> Allergies & Sensitivities
                        </h3>

                        {allergiesList.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl text-center border border-gray-100 dark:border-slate-800">
                            No known allergies reported by patient.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {allergiesList.map((alg: string, idx: number) => (
                              <span key={idx} className="bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize flex items-center gap-1.5">
                                ⚠️ {alg}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Systemic Conditions Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
                        <h3 className="text-lg font-bold text-gray-850 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
                          <Heart className="text-rose-500" size={20} /> Systemic Health Conditions
                        </h3>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <span className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Respiratory</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {respiratoryDisorders.asthma ? 'Asthma ' : ''}
                              {respiratoryDisorders.copd ? 'COPD ' : ''}
                              {respiratoryDisorders.other || (!respiratoryDisorders.asthma && !respiratoryDisorders.copd ? 'None' : '')}
                            </span>
                          </div>

                          <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <span className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Cardiovascular</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {heartProblems.hypertension ? 'Hypertension ' : ''}
                              {heartProblems.arrhythmia ? 'Arrhythmia ' : ''}
                              {heartProblems.other || (!heartProblems.hypertension && !heartProblems.arrhythmia ? 'None' : '')}
                            </span>
                          </div>

                          <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <span className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Mental Health</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {mentalHealth.anxiety ? 'Anxiety ' : ''}
                              {mentalHealth.depression ? 'Depression ' : ''}
                              {mentalHealth.other || (!mentalHealth.anxiety && !mentalHealth.depression ? 'None' : '')}
                            </span>
                          </div>

                          <div className="bg-gray-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-slate-700">
                            <span className="font-bold text-gray-700 dark:text-gray-300 block mb-1">Neurological</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {nervousDisorders.epilepsy ? 'Epilepsy ' : ''}
                              {nervousDisorders.other || (!nervousDisorders.epilepsy ? 'None' : '')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 6. Family History & Emergency Contacts (2 Grid Columns) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Family History Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
                        <h3 className="text-lg font-bold text-gray-850 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3">
                          Family Disease History
                        </h3>

                        {familyHistory.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl text-center border border-gray-100 dark:border-slate-800">
                            No family medical history recorded.
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-2xl border border-gray-150 dark:border-slate-800">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-150 dark:border-slate-700 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                  <th className="p-3">Relation</th>
                                  <th className="p-3">Condition</th>
                                  <th className="p-3">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                {familyHistory.map((item: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40">
                                    <td className="p-3 font-bold text-gray-800 dark:text-white">{item.relation || 'N/A'}</td>
                                    <td className="p-3 text-gray-600 dark:text-gray-300">{item.disease || 'N/A'}</td>
                                    <td className="p-3 text-gray-400 dark:text-gray-500">{item.notes || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Emergency Contacts Card */}
                      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
                        <h3 className="text-lg font-bold text-gray-850 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-3">
                          Emergency Contacts
                        </h3>

                        {emergencyContacts.length === 0 ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-slate-950 rounded-2xl text-center border border-gray-100 dark:border-slate-800">
                            No emergency contacts listed.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {emergencyContacts.map((contact: any, idx: number) => (
                              <div key={idx} className="bg-gray-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center justify-between">
                                <div>
                                  <h4 className="font-bold text-xs text-gray-850 dark:text-white">{contact.name || 'Contact'}</h4>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{contact.relation || 'Emergency Contact'}</p>
                                </div>
                                <a 
                                  href={`tel:${contact.phone}`} 
                                  className="bg-blue-50 dark:bg-blue-950/60 text-medical-blue dark:text-blue-400 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 border border-blue-100 dark:border-blue-900/40 hover:bg-blue-100 transition-colors"
                                >
                                  <Phone size={13} /> {contact.phone}
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 7. Doctor Access Audit Notifications */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 shadow-sm border border-gray-100 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                        <h3 className="text-xl font-bold text-gray-850 dark:text-white flex items-center gap-2">
                          <Bell className="text-emerald-500" size={22} /> Doctor Access Notifications & Audit Logs
                        </h3>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {notifications.length} Access Events
                        </span>
                      </div>

                      {notifications.length === 0 ? (
                        <div className="text-center p-10 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 space-y-2">
                          <Shield size={32} className="mx-auto text-gray-400 dark:text-gray-600" />
                          <h4 className="font-bold text-gray-800 dark:text-white text-base">No doctor access events recorded</h4>
                          <p className="text-xs max-w-sm mx-auto">
                            This patient has not registered any past access logs or doctor consent notifications yet.
                          </p>
                        </div>
                      ) : (
                        <div className="w-full overflow-x-auto rounded-2xl border border-gray-150 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
                          <table className="w-full min-w-[550px] border-collapse text-left text-xs">
                            <thead>
                              <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-150 dark:border-slate-700 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <th className="p-3">Doctor ID</th>
                                <th className="p-3">Doctor Name</th>
                                <th className="p-3">Access Method</th>
                                <th className="p-3">Accessed Date</th>
                                <th className="p-3">Session Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                              {notifications.map((log: any) => {
                                return (
                                  <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                    <td className="p-3 font-mono font-bold text-gray-700 dark:text-gray-300">
                                      {log.doctor_upahaar_id || 'N/A'}
                                    </td>
                                    <td className="p-3 font-bold text-gray-800 dark:text-white">
                                      Dr. {log.doctor_name || 'Doctor'}
                                    </td>
                                    <td className="p-3 font-semibold text-gray-600 dark:text-gray-300">
                                      <span className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2.5 py-1 rounded-md text-[10px]">
                                        {log.method || 'MANUAL'}
                                      </span>
                                    </td>
                                    <td className="p-3 text-gray-500 dark:text-gray-400">
                                      <div>{new Date(log.created_at).toLocaleDateString()}</div>
                                      <div className="font-semibold text-gray-400 dark:text-gray-500 text-[10px]">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </td>
                                    <td className="p-3">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        log.status === 'APPROVED' || log.status === 'ACKNOWLEDGED' || log.status === 'QR_SCAN'
                                          ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/40'
                                          : log.status === 'REVOKED'
                                          ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/40'
                                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40'
                                      }`}>
                                        {log.status}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                  </div>
                ) : null}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
