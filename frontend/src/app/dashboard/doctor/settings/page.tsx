'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Moon, Sun, ShieldCheck, LogOut, Search, Clock, Stethoscope, Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import DoctorSidebar from '../../../components/DoctorSidebar';

export default function DoctorSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [accessHistory, setAccessHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [thought, setThought] = useState('Available for consultations');
  const [isEditingThought, setIsEditingThought] = useState(false);
  const [tempThought, setTempThought] = useState('');
  const [theme, setTheme] = useState('light');
  const [showHistoryList, setShowHistoryList] = useState(false);
  const [loading, setLoading] = useState(true);

  const getFileUrl = (url?: string) => {
    if (!url) return '#';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fetchDoctorProfile = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) return;
    try {
      const response = await fetch('/api/doctors/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch doctor profile:', err);
    }
  };

  const fetchAccessedHistory = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) return;
    try {
      const response = await fetch('/api/doctors/accessed-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAccessHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch accessed history:', err);
    }
  };

  useEffect(() => {
    // Theme setup
    const savedTheme = localStorage.getItem('upahaar_theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Load status thought
    const savedThought = localStorage.getItem('upahaar_doctor_thought') || 'Available for consultations';
    setThought(savedThought);
    setTempThought(savedThought);

    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchDoctorProfile(), fetchAccessedHistory()]);
      setLoading(false);
    };
    initData();
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('upahaar_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleSaveThought = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = tempThought.trim() || 'Available for consultations';
    setThought(updated);
    localStorage.setItem('upahaar_doctor_thought', updated);
    setIsEditingThought(false);
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out from UPAHAAR Doctor Portal?")) {
      localStorage.removeItem('upahaar_token');
      sessionStorage.clear();
      router.push('/auth/doctor/login');
    }
  };

  const settingsOptions = [
    {
      id: 'profile',
      title: 'Professional Profile',
      subtext: 'Name, photo, job profile, medical education & past work experiences',
      icon: <User size={24} className="text-blue-500 dark:text-blue-400" />,
      onClick: () => router.push('/dashboard/doctor/profile-setup'),
      type: 'link'
    },
    {
      id: 'theme',
      title: 'Theme',
      subtext: 'Toggle between Light and Dark mode',
      icon: theme === 'dark' ? <Moon size={24} className="text-yellow-400" /> : <Sun size={24} className="text-yellow-500" />,
      type: 'toggle'
    },
    {
      id: 'history',
      title: 'Patient History Accessed',
      subtext: 'View log of all patient records accessed during consults',
      icon: <ShieldCheck size={24} className="text-emerald-500 dark:text-emerald-400" />,
      onClick: () => setShowHistoryList(!showHistoryList),
      type: 'expandable'
    },
    {
      id: 'logout',
      title: 'Logout',
      subtext: 'Securely sign out of your UPAHAAR doctor registry account',
      icon: <LogOut size={24} className="text-red-500 dark:text-red-400" />,
      onClick: handleLogout,
      type: 'action'
    }
  ];

  const filteredOptions = settingsOptions.filter(opt => 
    opt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.subtext.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <DoctorSidebar activePage="settings" />

      {/* Main Settings Panel */}
      <main className="flex-1 p-6 lg:p-10 flex justify-center">
        <div className="max-w-2xl w-full space-y-6">
          
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Doctor Settings</h1>

          {loading ? (
            <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-blue mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400 font-semibold">Loading doctor settings...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* WhatsApp-style User Details Card */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between relative overflow-visible">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {profile?.face_photo_url && profile.face_photo_url !== 'dummy-url-for-now' ? (
                      <img 
                        src={getFileUrl(profile.face_photo_url)} 
                        alt="Doctor Photo" 
                        className="w-20 h-20 rounded-full object-cover border-4 border-medical-blue/20 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-medical-blue/10 dark:bg-blue-950/60 text-medical-blue dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-2xl border border-medical-blue/20 dark:border-blue-800/40 shadow-inner">
                        {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'D'}
                      </div>
                    )}
                    
                    {/* Status thought bubble */}
                    <div 
                      className="absolute -top-6 -right-6 md:-right-10 bg-gray-900 dark:bg-slate-800 text-white text-[11px] px-3 py-1.5 rounded-full shadow-lg max-w-[130px] md:max-w-[160px] truncate border border-gray-700/50 dark:border-slate-700 flex items-center gap-1 cursor-pointer hover:bg-gray-800 dark:hover:bg-slate-700 transition-all"
                      onClick={() => { setIsEditingThought(true); setTempThought(thought === 'Available for consultations' ? '' : thought); }}
                    >
                      💬 <span className="italic">{thought}</span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-850 dark:text-white leading-tight">
                      Dr. {profile?.full_name || 'Doctor'}
                    </h2>
                    {profile?.job_profile && (
                      <p className="text-xs font-semibold text-medical-blue dark:text-blue-400 mt-0.5 flex items-center gap-1">
                        <Briefcase size={13} /> {profile.job_profile}
                      </p>
                    )}
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">
                      ID: <span className="font-mono tracking-wider">{profile?.upahaar_id || 'N/A'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Status thought editor */}
              <AnimatePresence>
                {isEditingThought && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden bg-blue-50/50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 rounded-2xl p-4 shadow-inner"
                  >
                    <form onSubmit={handleSaveThought} className="flex gap-2">
                      <input 
                        type="text" 
                        maxLength={45}
                        placeholder="Update status or availability..."
                        className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-700 outline-none bg-white dark:bg-slate-950 text-gray-850 dark:text-white text-sm"
                        value={tempThought}
                        onChange={e => setTempThought(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="bg-medical-blue hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition">
                        Save
                      </button>
                      <button type="button" className="text-gray-500 dark:text-gray-400 px-2 text-sm hover:underline" onClick={() => setIsEditingThought(false)}>
                        Cancel
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-400 dark:text-gray-500" size={18} />
                <input 
                  type="text" 
                  placeholder="Search doctor settings"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-800 outline-none bg-white dark:bg-slate-900 text-gray-850 dark:text-white focus:ring-2 focus:ring-medical-blue dark:focus:ring-blue-500 transition-shadow text-sm placeholder-gray-400 dark:placeholder-gray-500"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Options Group Container */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-slate-800 divide-y divide-gray-150 dark:divide-slate-800">
                {filteredOptions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                    No settings match your search query
                  </div>
                ) : (
                  filteredOptions.map((opt) => (
                    <div key={opt.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      {opt.type === 'toggle' ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl shrink-0 mt-0.5">
                              {opt.icon}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-850 dark:text-white text-base">{opt.title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{opt.subtext}</p>
                            </div>
                          </div>
                          {/* Toggle Switch */}
                          <button 
                            onClick={handleToggleTheme}
                            className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors outline-none ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}
                          >
                            <motion.div 
                              layout 
                              className="bg-white w-6 h-6 rounded-full shadow-md flex items-center justify-center text-xs"
                              animate={{ x: theme === 'dark' ? 24 : 0 }}
                              transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            >
                              {theme === 'dark' ? '🌙' : '☀️'}
                            </motion.div>
                          </button>
                        </div>
                      ) : (
                        <div 
                          className="flex items-start justify-between cursor-pointer"
                          onClick={opt.onClick}
                        >
                          <div className="flex items-start gap-4 w-full">
                            <div className="p-2 bg-gray-100 dark:bg-slate-800 rounded-xl shrink-0 mt-0.5">
                              {opt.icon}
                            </div>
                            <div className="w-full">
                              <h3 className="font-bold text-gray-850 dark:text-white text-base">{opt.title}</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{opt.subtext}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expandable Patient Access Logs list */}
                      {opt.id === 'history' && showHistoryList && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                          {accessHistory.length === 0 ? (
                            <div className="text-center p-6 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-950 rounded-2xl border border-gray-100 dark:border-slate-800 text-sm">
                              No patient records accessed yet.
                            </div>
                          ) : (
                            <div className="w-full overflow-x-auto rounded-2xl border border-gray-150 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
                              <table className="w-full min-w-[520px] border-collapse text-left">
                                <thead>
                                  <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-150 dark:border-slate-700">
                                    <th className="p-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient ID</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Patient Name</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Accessed Date</th>
                                    <th className="p-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Session Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                                  {accessHistory.map((log) => {
                                    const getEndSessionStatus = () => {
                                      if (log.status === 'REVOKED') {
                                        return {
                                          text: 'Revoked by Patient',
                                          style: 'text-red-500 dark:text-red-400 font-semibold text-xs'
                                        };
                                      }
                                      if (log.status === 'PENDING') {
                                        return {
                                          text: 'Awaiting Consent',
                                          style: 'text-amber-500 dark:text-amber-400 font-semibold italic text-xs'
                                        };
                                      }
                                      if (log.logged_out_at) {
                                        return {
                                          text: `Closed ${new Date(log.logged_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                                          style: 'text-gray-500 dark:text-gray-400 font-medium text-xs'
                                        };
                                      }

                                      const createdTime = new Date(log.created_at).getTime();
                                      const isExpired = Date.now() - createdTime >= 30 * 60 * 1000;
                                      if (isExpired) {
                                        return {
                                          text: 'Expired (30m)',
                                          style: 'text-gray-500 dark:text-gray-400 font-medium text-xs'
                                        };
                                      }

                                      return {
                                        text: 'Active Session',
                                        style: 'text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded-full border border-green-200 dark:border-green-800/30 text-[10px] animate-pulse inline-block'
                                      };
                                    };

                                    const endStatus = getEndSessionStatus();

                                    return (
                                      <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="p-3 text-xs font-mono font-bold text-gray-700 dark:text-gray-300">
                                          {log.patient_upahaar_id || 'N/A'}
                                        </td>
                                        <td className="p-3 text-xs font-bold text-gray-800 dark:text-white">
                                          {log.patient_name}
                                        </td>
                                        <td className="p-3 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                                          <span className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2 py-0.5 rounded-md text-[10px]">
                                            {log.method || 'MANUAL'}
                                          </span>
                                        </td>
                                        <td className="p-3 text-[11px] text-gray-500 dark:text-gray-400">
                                          <div>{new Date(log.created_at).toLocaleDateString()}</div>
                                          <div className="font-semibold text-gray-400 dark:text-gray-500 text-[10px]">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </td>
                                        <td className="p-3">
                                          <span className={endStatus.style}>{endStatus.text}</span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
