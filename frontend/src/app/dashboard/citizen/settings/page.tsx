'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Moon, Sun, ShieldCheck, LogOut, Search, Check, 
  Clock, Settings, Eye, CheckCircle2, Ban, ShieldAlert 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CitizenSidebar from '../../../components/CitizenSidebar';

export default function CitizenSettings() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [thought, setThought] = useState('Share a thought');
  const [isEditingThought, setIsEditingThought] = useState(false);
  const [tempThought, setTempThought] = useState('');
  const [theme, setTheme] = useState('light');
  const [showDoctorsList, setShowDoctorsList] = useState(false);
  const [loading, setLoading] = useState(true);

  const getFileUrl = (url?: string) => {
    if (!url) return '#';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const fetchProfile = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    }
  };

  const fetchNotifications = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    // Check initial theme
    const savedTheme = localStorage.getItem('upahaar_theme') || 'light';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Load status thought
    const savedThought = localStorage.getItem('upahaar_thought') || 'Share a thought';
    setThought(savedThought);
    setTempThought(savedThought);

    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchNotifications()]);
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
    const updated = tempThought.trim() || 'Share a thought';
    setThought(updated);
    localStorage.setItem('upahaar_thought', updated);
    setIsEditingThought(false);
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
        alert(data.message || `Failed to ${action} access`);
      }
    } catch (err) {
      console.error(`Failed to ${action} access:`, err);
    }
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out from UPAHAAR?")) {
      localStorage.removeItem('upahaar_token');
      router.push('/auth/citizen/login');
    }
  };

  const settingsOptions = [
    {
      id: 'profile',
      title: 'Medical Profile',
      subtext: 'Name, photo, emergency contacts, blood group, allergies & details',
      icon: <User size={24} className="text-blue-500" />,
      onClick: () => router.push('/dashboard/citizen/profile-setup'),
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
      id: 'access',
      title: 'Doctors that accessed profile',
      subtext: 'View and manage doctors who viewed your digital health card',
      icon: <ShieldCheck size={24} className="text-emerald-500" />,
      onClick: () => setShowDoctorsList(!showDoctorsList),
      type: 'expandable'
    },
    {
      id: 'logout',
      title: 'Logout',
      subtext: 'Securely sign out of your UPAHAAR patient registry account',
      icon: <LogOut size={24} className="text-red-500" />,
      onClick: handleLogout,
      type: 'action'
    }
  ];

  const filteredOptions = settingsOptions.filter(opt => 
    opt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.subtext.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row transition-colors duration-300">
      
      {/* Sidebar Navigation */}
      <CitizenSidebar activePage="settings" />

      {/* Main Settings Panel */}
      <main className="flex-1 p-6 lg:p-10 flex justify-center">
        <div className="max-w-xl w-full space-y-6">
          
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white">Settings</h1>

          {loading ? (
            <div className="text-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medical-blue mx-auto mb-4"></div>
              <p className="text-gray-500 font-semibold">Loading settings...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* WhatsApp-style User Details Card */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center justify-between relative overflow-visible">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    {profile?.face_photo_url && profile.face_photo_url !== 'dummy-url-for-now' ? (
                      <img 
                        src={getFileUrl(profile.face_photo_url)} 
                        alt="Profile Photo" 
                        className="w-20 h-20 rounded-full object-cover border-4 border-medical-blue/20 shadow-md"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-medical-blue/10 text-medical-blue rounded-full flex items-center justify-center font-bold text-2xl border border-medical-blue/20 shadow-inner">
                        {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    
                    {/* Status thought bubble (Interactive "Share a thought") */}
                    <div className="absolute -top-6 -right-6 md:-right-10 bg-gray-900 text-white text-[11px] px-3 py-1.5 rounded-full shadow-lg max-w-[130px] md:max-w-[150px] truncate border border-gray-700/50 flex items-center gap-1 cursor-pointer hover:bg-gray-850" onClick={() => { setIsEditingThought(true); setTempThought(thought === 'Share a thought' ? '' : thought); }}>
                      💬 <span className="italic">{thought}</span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-gray-850 dark:text-white leading-tight">
                      {profile?.full_name || 'Citizen'}
                    </h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                      ID: <span className="font-mono tracking-wider">{profile?.upahaar_id || 'Generating...'}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Status thought bubble editor */}
              <AnimatePresence>
                {isEditingThought && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden bg-blue-50/50 border border-blue-100 rounded-2xl p-4 shadow-inner"
                  >
                    <form onSubmit={handleSaveThought} className="flex gap-2">
                      <input 
                        type="text" 
                        maxLength={40}
                        placeholder="What is on your mind?"
                        className="flex-1 px-4 py-2 rounded-xl border outline-none bg-white text-sm"
                        value={tempThought}
                        onChange={e => setTempThought(e.target.value)}
                        autoFocus
                      />
                      <button type="submit" className="bg-medical-blue text-white font-bold px-4 py-2 rounded-xl text-sm hover:bg-blue-700 transition">
                        Save
                      </button>
                      <button type="button" className="text-gray-500 px-2 text-sm hover:underline" onClick={() => setIsEditingThought(false)}>
                        Cancel
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-3.5 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search settings"
                  className="w-full pl-12 pr-4 py-3 rounded-2xl border outline-none bg-white focus:ring-2 focus:ring-medical-blue transition-shadow text-sm"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Options Group Container */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 divide-y divide-gray-150">
                {filteredOptions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 font-medium">
                    No settings match your search query
                  </div>
                ) : (
                  filteredOptions.map((opt) => (
                    <div key={opt.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      {opt.type === 'toggle' ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-gray-100 rounded-xl shrink-0 mt-0.5">
                              {opt.icon}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-850 dark:text-white text-base">{opt.title}</h3>
                              <p className="text-sm text-gray-500 mt-0.5">{opt.subtext}</p>
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
                            <div className="p-2 bg-gray-100 rounded-xl shrink-0 mt-0.5">
                              {opt.icon}
                            </div>
                            <div className="w-full">
                              <h3 className="font-bold text-gray-850 dark:text-white text-base">{opt.title}</h3>
                              <p className="text-sm text-gray-500 mt-0.5">{opt.subtext}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Expandable Doctor Access Logs list */}
                      {opt.id === 'access' && showDoctorsList && (
                        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                          {notifications.length === 0 ? (
                            <div className="text-center p-6 text-gray-500 bg-gray-50 rounded-2xl border border-gray-100">
                              No doctor access logs found.
                            </div>
                          ) : (
                             <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                              {notifications.map((log) => (
                                <div key={log.id} className="bg-gray-50 dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/60 shadow-sm flex flex-col gap-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-bold text-gray-800 dark:text-white text-sm">
                                        Dr. {log.doctor_name}
                                      </h4>
                                      <p className="text-xs text-gray-500 mt-0.5">
                                        UPAHAAR ID: <span className="font-mono font-semibold text-gray-750 dark:text-gray-300">{log.doctor_upahaar_id || 'N/A'}</span>
                                      </p>
                                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Eye size={12} /> Accessed via {log.method}
                                      </p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      log.status === 'REVOKED' 
                                        ? 'bg-red-100 text-red-700' 
                                        : log.status === 'ACKNOWLEDGED'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {log.status}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-250/20 pt-2">
                                    <span className="flex items-center gap-1"><Clock size={11} /> {new Date(log.created_at).toLocaleString()}</span>
                                    
                                    {log.status !== 'REVOKED' ? (
                                      <div className="flex gap-1.5 shrink-0">
                                        {log.status === 'PENDING' && (
                                          <button 
                                            onClick={() => handleNotificationAction(log.id, 'acknowledge')}
                                            className="px-2.5 py-1 bg-green-100 text-green-700 hover:bg-green-200 font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                                          >
                                            <CheckCircle2 size={12}/> Acknowledge
                                          </button>
                                        )}
                                        <button 
                                          onClick={() => handleNotificationAction(log.id, 'revoke')}
                                          className="px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 font-bold rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                                          title="Terminate profile access rights for this doctor"
                                        >
                                          <Ban size={12}/> Terminate Access
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="text-red-500 font-semibold italic text-[11px]">Access Terminated</span>
                                    )}
                                  </div>
                                </div>
                              ))}
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
