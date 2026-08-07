'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Syringe, Calendar, Clock, AlertCircle, CheckCircle, ShieldCheck, X, Plus, QrCode, Activity, Settings } from 'lucide-react';
import Link from 'next/link';
import CitizenSidebar from '../../../components/CitizenSidebar';

interface Vaccine {
  name: string;
  targetAge: number;
  description: string;
}

interface CompletedVaccine extends Vaccine {
  completedAt: string;
}

const vaccineSchedule: Vaccine[] = [
  { name: 'DPT Booster-1, OPV Booster, MR-2, JE-2', targetAge: 2, description: 'Crucial boosters for Diphtheria, Pertussis, Tetanus, Polio, Measles, Rubella, and Japanese Encephalitis.' },
  { name: 'DPT Booster-2', targetAge: 5, description: 'Second booster dose for Diphtheria, Pertussis, and Tetanus before school entry.' },
  { name: 'Td (Tetanus & Diphtheria)', targetAge: 10, description: 'Adolescent booster for Tetanus and Diphtheria.' },
  { name: 'Td (Tetanus & Diphtheria)', targetAge: 16, description: 'Young adult booster for Tetanus and Diphtheria.' }
];

export default function VaccineScheduler() {
  const [dob, setDob] = useState<string | null>(null);
  const [age, setAge] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedVaccines, setCompletedVaccines] = useState<CompletedVaccine[]>([]);
  const [confirmVaccine, setConfirmVaccine] = useState<Vaccine | null>(null);

  const [customVaccines, setCustomVaccines] = useState<Vaccine[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    const savedTheme = localStorage.getItem('upahaar_theme') || 'light';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Load completed vaccines from localStorage
    const stored = localStorage.getItem('upahaar_completed_vaccines');
    if (stored) {
      try {
        setCompletedVaccines(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse completed vaccines', e);
      }
    }

    // Load custom vaccines from localStorage
    const storedCustom = localStorage.getItem('upahaar_custom_vaccines');
    if (storedCustom) {
      try {
        setCustomVaccines(JSON.parse(storedCustom));
      } catch (e) {
        console.error('Failed to parse custom vaccines', e);
      }
    }

    const fetchProfile = async () => {
      const token = localStorage.getItem('upahaar_token');
      if (!token) return;

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.dob) {
            setDob(data.dob);
            calculateAge(data.dob);
          }
        }
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const calculateAge = (dobString: string) => {
    const birthDate = new Date(dobString);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    setAge(calculatedAge);
  };

  const isVaccineCompleted = (vac: Vaccine) => {
    return completedVaccines.some(cv => cv.name === vac.name && cv.targetAge === vac.targetAge);
  };

  const handleMarkDone = (vac: Vaccine) => {
    setConfirmVaccine(vac);
  };

  const handleConfirmDone = () => {
    if (!confirmVaccine) return;
    const newCompleted: CompletedVaccine = {
      ...confirmVaccine,
      completedAt: new Date().toISOString()
    };
    const updated = [...completedVaccines, newCompleted];
    setCompletedVaccines(updated);
    localStorage.setItem('upahaar_completed_vaccines', JSON.stringify(updated));
    setConfirmVaccine(null);
  };

  const getStatus = (targetAge: number) => {
    if (age === null) return null;
    if (age > targetAge) return { status: 'Overdue / Completed', color: 'text-green-600', bg: 'bg-green-100', icon: <CheckCircle size={16}/> };
    if (age === targetAge) return { status: 'Due Now', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertCircle size={16}/> };
    return { status: 'Upcoming', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Clock size={16}/> };
  };

  const handleAddCustomVaccine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAge || !newDesc.trim()) return;

    const newVac: Vaccine = {
      name: newName.trim(),
      targetAge: parseInt(newAge, 10),
      description: newDesc.trim()
    };

    const updated = [...customVaccines, newVac];
    setCustomVaccines(updated);
    localStorage.setItem('upahaar_custom_vaccines', JSON.stringify(updated));

    // Reset fields & close modal
    setNewName('');
    setNewAge('');
    setNewDesc('');
    setIsAddModalOpen(false);
  };

  const combinedSchedule = [...vaccineSchedule, ...customVaccines].sort((a, b) => a.targetAge - b.targetAge);
  const pendingVaccines = combinedSchedule.filter(v => !isVaccineCompleted(v));

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <CitizenSidebar activePage="vaccines" />

      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <header className="bg-medical-blue p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3"><Syringe size={32} /> Smart Vaccine Scheduler</h1>
                <p className="text-blue-100 max-w-xl">We analyze your age and calculate your upcoming government-mandated vaccinations automatically.</p>
             </div>
             <Syringe size={150} className="absolute -right-10 -bottom-10 text-white/10 rotate-12" />
          </header>

          {loading ? (
             <div className="text-center p-10"><p className="text-gray-500 font-semibold animate-pulse">Loading medical profile...</p></div>
          ) : !dob ? (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center">
               <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
               <h2 className="text-xl font-bold text-gray-800 mb-2">Date of Birth Missing</h2>
               <p className="text-gray-600 mb-6">We cannot suggest vaccines without knowing your age. Please update your Date of Birth in your profile.</p>
               <Link href="/dashboard/citizen/profile-setup" className="bg-medical-blue text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition">Update Profile</Link>
            </div>
          ) : (
            <div className="space-y-6">
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                  <div className="bg-blue-50 p-4 rounded-xl text-medical-blue">
                     <Calendar size={32} />
                  </div>
                  <div>
                     <p className="text-sm text-gray-500 font-bold uppercase tracking-wide">Patient Age</p>
                     <p className="text-2xl font-extrabold text-gray-800">{age} Years Old</p>
                  </div>
               </div>

               {/* Vaccine Schedule */}
               <div className="space-y-6">
                 <div className="flex justify-between items-center">
                   <h3 className="text-xl font-bold text-medical-dark">Vaccination Schedule</h3>
                   <button
                     onClick={() => setIsAddModalOpen(true)}
                     className="flex items-center gap-2 bg-medical-blue hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                   >
                     <Plus size={16} /> Add Vaccine
                   </button>
                 </div>

                 {pendingVaccines.length > 0 ? (
                   <div className="space-y-4">
                     {pendingVaccines.map((vac, idx) => {
                        const statusInfo = getStatus(vac.targetAge);
                        
                        return (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
                            key={`${vac.name}-${vac.targetAge}-${idx}`} 
                            className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${age === vac.targetAge ? 'border-red-500 shadow-md transform scale-[1.01]' : 'border-gray-200'} transition-all`}
                          >
                             <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-bold text-lg text-gray-800">{vac.name}</h4>
                                  <p className="text-sm text-gray-500 font-medium">Scheduled at: {vac.targetAge} Years</p>
                                </div>
                                {statusInfo && (
                                   <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${statusInfo.bg} ${statusInfo.color}`}>
                                      {statusInfo.icon} {statusInfo.status}
                                   </span>
                                )}
                             </div>
                             <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">{vac.description}</p>
                             
                             <button
                               onClick={() => handleMarkDone(vac)}
                               className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-sm active:scale-[0.98]"
                             >
                               <ShieldCheck size={16} /> Mark as Done
                             </button>
                          </motion.div>
                        );
                     })}
                   </div>
                 ) : (
                   <div className="bg-emerald-50 p-8 rounded-2xl border border-emerald-100 text-center">
                     <CheckCircle size={48} className="mx-auto text-emerald-500 mb-4" />
                     <h3 className="text-xl font-bold text-gray-800 mb-2">All Caught Up!</h3>
                     <p className="text-gray-600">All scheduled vaccinations have been marked as completed.</p>
                   </div>
                 )}
               </div>

               {/* Vaccinations Done Section */}
               {completedVaccines.length > 0 && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 mt-8">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-px flex-1 bg-emerald-200"></div>
                      <h3 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                        <ShieldCheck size={22} className="text-emerald-600" /> Vaccinations Done
                      </h3>
                      <div className="h-px flex-1 bg-emerald-200"></div>
                    </div>

                    {completedVaccines.map((vac, idx) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        key={`done-${vac.name}-${vac.targetAge}-${idx}`}
                        className="bg-emerald-50/60 p-5 rounded-2xl border border-emerald-200 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                          Completed
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="bg-emerald-100 p-3 rounded-full shrink-0 mt-0.5">
                            <CheckCircle size={22} className="text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-lg">{vac.name}</h4>
                            <p className="text-sm text-gray-500 font-medium mb-1">Scheduled at: {vac.targetAge} Years</p>
                            <p className="text-sm text-gray-600 bg-white/60 p-2.5 rounded-lg border border-emerald-100">{vac.description}</p>
                            <p className="text-xs text-emerald-700 font-semibold mt-2">
                              ✓ Marked complete on {new Date(vac.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                 </motion.div>
               )}
            </div>
          )}

        </div>
      </main>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmVaccine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setConfirmVaccine(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-5">
                <div className="bg-emerald-100 p-3 rounded-2xl">
                  <Syringe size={28} className="text-emerald-600" />
                </div>
                <button
                  onClick={() => setConfirmVaccine(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Vaccination</h3>
              <p className="text-gray-600 mb-4">Are you sure you want to mark the following vaccination as completed?</p>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                <h4 className="font-bold text-gray-800">{confirmVaccine.name}</h4>
                <p className="text-sm text-gray-500 mt-1">Target age: {confirmVaccine.targetAge} years</p>
              </div>

              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 mb-6 flex gap-2">
                <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  <strong>Please confirm</strong> that this vaccine has been administered. This action will move it to your completed vaccinations list.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmVaccine(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDone}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <CheckCircle size={16} /> Yes, It's Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Custom Vaccine Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setIsAddModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-5">
                <div className="bg-blue-100 p-3 rounded-2xl text-medical-blue">
                  <Syringe size={28} />
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-bold text-gray-800 mb-2">Add Custom Vaccine</h3>
              <p className="text-gray-600 mb-6 text-sm">Schedule a vaccine recommended for you by your healthcare provider.</p>

              <form onSubmit={handleAddCustomVaccine} className="space-y-4">
                <div>
                  <label htmlFor="vaccineName" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Vaccine Name
                  </label>
                  <input
                    id="vaccineName"
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Hepatitis A, Influenza"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-medical-blue/20 focus:border-medical-blue transition text-gray-800 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="scheduledAge" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Scheduled Age (in years)
                  </label>
                  <input
                    id="scheduledAge"
                    type="number"
                    min="0"
                    max="120"
                    required
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="e.g. 18"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-medical-blue/20 focus:border-medical-blue transition text-gray-800 text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="vaccineDesc" className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    One-Liner Use / Purpose
                  </label>
                  <input
                    id="vaccineDesc"
                    type="text"
                    required
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="e.g. Protects against seasonal flu."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-medical-blue/20 focus:border-medical-blue transition text-gray-800 text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-bold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-medical-blue hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                  >
                    Add Vaccine
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
