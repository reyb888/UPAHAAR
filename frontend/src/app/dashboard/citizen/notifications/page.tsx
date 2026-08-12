'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Eye, Clock, ShieldCheck, CheckCircle2, Ban, ShieldAlert, X, Shield, User
} from 'lucide-react';
import Link from 'next/link';
import CitizenSidebar from '../../../components/CitizenSidebar';

export default function CitizenNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

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
      } else {
        setError('Failed to fetch notifications');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

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

  const handleDeleteNotification = async () => {
    if (!deletingLogId) return;
    const token = localStorage.getItem('upahaar_token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/notifications/${deletingLogId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchNotifications();
      } else {
        alert('Failed to delete notification record');
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingLogId(null);
    }
  };

  // Filter requests
  const pendingRequests = notifications.filter(
    (log) => log.status === 'PENDING' && log.method !== 'QR_SCAN'
  );
  
  const pastLogs = notifications.filter(
    (log) => !(log.status === 'PENDING' && log.method !== 'QR_SCAN')
  );

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-slate-950 flex flex-col md:flex-row">
      <CitizenSidebar activePage="notifications" />
      
      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Bell size={24} className="text-medical-blue dark:text-blue-400 animate-swing" /> Notifications
              </h1>
              <p className="text-gray-500 dark:text-gray-400">Review historical consent logs and manage active doctor access requests.</p>
            </div>
          </header>

          {loading ? (
            <div className="text-center p-20">
              <div className="w-12 h-12 border-4 border-medical-blue dark:border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400 font-semibold">Loading your notifications...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-950/40 p-6 rounded-xl text-red-600 dark:text-red-400 text-center border border-red-100 dark:border-red-500/30">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-gray-100 dark:border-slate-800 text-center shadow-sm">
              <Bell size={48} className="mx-auto text-gray-300 dark:text-slate-700 mb-4" />
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">No Notifications</h3>
              <p className="text-gray-500 dark:text-gray-400">You have no pending doctor access requests or logs.</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Past Logs Repository */}
              <div>
                <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">Access History Repository</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <AnimatePresence>
                    {pastLogs.map((log) => {
                      const isQr = log.method === 'QR_SCAN';
                      const isRevoked = log.status === 'REVOKED';
                      const isApproved = log.status === 'APPROVED' || log.status === 'ACKNOWLEDGED';

                      let cardStyle = "bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800";
                      let badgeStyle = "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300";
                      let badgeText = log.status;
                      let statusMsgText = "Access status: Unspecified";

                      if (isQr) {
                        cardStyle = "bg-gradient-to-br from-purple-50/50 to-white border-purple-100/70 shadow-sm shadow-purple-50/10 dark:from-purple-950/40 dark:to-slate-900 dark:border-purple-500/30 dark:shadow-none";
                        badgeStyle = "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300";
                        badgeText = "Emergency Access";
                        statusMsgText = "Emergency access granted";
                      } else if (isRevoked) {
                        cardStyle = "bg-gradient-to-br from-red-50/40 to-white border-red-100/70 shadow-sm shadow-red-50/10 dark:from-red-950/40 dark:to-slate-900 dark:border-red-500/30 dark:shadow-none";
                        badgeStyle = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
                        badgeText = "Access Blocked";
                        statusMsgText = "Denied";
                      } else if (isApproved) {
                        cardStyle = "bg-gradient-to-br from-emerald-50/40 to-white border-emerald-100/70 shadow-sm shadow-emerald-50/10 dark:from-emerald-950/40 dark:to-slate-900 dark:border-emerald-500/30 dark:shadow-none";
                        badgeStyle = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
                        badgeText = "Access Granted";
                        statusMsgText = "Allowed";
                      }

                      return (
                        <motion.div 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          key={log.id} 
                          className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between relative transition-all duration-300 ${cardStyle}`}
                        >
                          {/* Red Cross Delete Button */}
                          <button 
                            onClick={() => { setDeletingLogId(log.id); setShowDeleteConfirm(true); }}
                            className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 p-1.5 rounded-full transition-all duration-200"
                            title="Delete access history item"
                          >
                            <X size={16} />
                          </button>

                          <div>
                            <div className="flex justify-between items-start gap-4 mb-4 pr-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 dark:bg-slate-800 text-medical-blue dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100 dark:border-slate-700">
                                  Dr.
                                </div>
                                <div>
                                  <h4 className="font-bold text-gray-800 dark:text-white text-sm">
                                    Dr. {log.doctor_name}
                                  </h4>
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    UPAHAAR ID: <span className="font-mono font-semibold">{log.doctor_upahaar_id || 'N/A'}</span>
                                  </p>
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                                    <Eye size={12} /> Requested via {log.method === 'QR_SCAN' ? 'QR Code' : log.method === 'FACE_SCAN' ? 'Facial Recognition' : 'Manual Lookup'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Shared Info */}
                            <div className="space-y-2.5 py-4 border-t border-b border-gray-100 dark:border-slate-800 my-4 text-xs">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><Clock size={14} className="text-gray-400 dark:text-gray-500" /> Date requested</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">{new Date(log.created_at).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><ShieldCheck size={14} className="text-gray-400 dark:text-gray-500" /> Data Shared</span>
                                <span className="font-semibold text-gray-800 dark:text-gray-200">Timeline • Meds • Vitals</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1"><ShieldAlert size={14} className="text-gray-400 dark:text-gray-500" /> Status Badge</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyle}`}>{badgeText}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 flex justify-between items-center">
                            <span className={`text-xs ${isQr ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-gray-400 dark:text-gray-500 font-medium'}`}>
                              {isQr ? '⚡ ' : ''}{statusMsgText}
                            </span>
                            
                            {!isQr && !isRevoked && (
                              <button 
                                onClick={() => handleNotificationAction(log.id, 'revoke')}
                                className="px-3 py-1.5 border border-red-200 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:border-red-300 dark:hover:border-red-500/60 font-bold rounded-lg transition-colors text-xs"
                                title="Terminate profile access rights for this doctor"
                              >
                                Terminate Access
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      {/* Awaiting Approval Modal Pop-up (Blue Ribbon UPAHAAR Card Style) */}
      <AnimatePresence>
        {pendingRequests.length > 0 && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-150 flex flex-col"
            >
{/* Blue Ribbon UPAHAAR Header */}
               <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-slate-900 dark:to-slate-950 p-6 text-white dark:text-white text-center relative flex flex-col items-center">
                 <div className="w-16 h-16 bg-white/10 dark:bg-slate-800/20 rounded-full flex items-center justify-center mb-3 border border-white/20 dark:border-slate-600/20">
                   <User size={32} className="text-white dark:text-white" />
                 </div>
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Dr. {pendingRequests[0].doctor_name}
                </h2>
<div className="bg-white/20 dark:bg-slate-800/20 text-white dark:text-white border border-white/30 dark:border-slate-600/30 text-xs px-3 py-1 rounded-full mt-2 font-mono font-semibold">
  {pendingRequests[0].doctor_upahaar_id || 'UPAHAAR ID'}
</div>
              </div>

              {/* White Box under it */}
              <div className="p-6 bg-white text-center flex flex-col items-center">
<div className="bg-gray-50 dark:bg-slate-800 border border-gray-150 dark:border-slate-600 rounded-2xl p-5 w-full text-gray-600 dark:text-gray-300 font-medium text-sm mb-6 leading-relaxed">
                   This doctor wants to access your profile.
                 </div>
                
                <div className="flex gap-4 w-full">
                  <button 
                    onClick={() => handleNotificationAction(pendingRequests[0].id, 'acknowledge')}
                    className="flex-1 py-3 bg-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-white font-extrabold rounded-xl transition-all shadow-md text-sm cursor-pointer"
                  >
                    Accept
                  </button>
                  <button 
                    onClick={() => handleNotificationAction(pendingRequests[0].id, 'revoke')}
                    className="flex-1 py-3 bg-rose-500 dark:bg-rose-600 dark:hover:bg-rose-700 hover:bg-rose-600 active:scale-95 text-white font-extrabold rounded-xl transition-all shadow-md text-sm cursor-pointer"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-150 text-center"
            >
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Access Record?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this access record from your history? This action is permanent.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => { setShowDeleteConfirm(false); setDeletingLogId(null); }}
                  className="flex-1 py-2.5 border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-bold rounded-xl transition-colors text-xs"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteNotification}
                  className="flex-1 py-2.5 bg-red-600 dark:bg-red-700 dark:hover:bg-red-800 hover:bg-red-700 text-white font-bold rounded-xl transition-colors text-xs shadow-sm"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
