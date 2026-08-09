'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Eye, Clock, ShieldCheck, CheckCircle2, Ban, ShieldAlert 
} from 'lucide-react';
import Link from 'next/link';
import CitizenSidebar from '../../../components/CitizenSidebar';

export default function CitizenNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <CitizenSidebar activePage="notifications" />
      
      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Bell size={24} className="text-medical-blue animate-swing" /> Notifications
              </h1>
              <p className="text-gray-500">Manage doctor access requests and review historical permissions.</p>
            </div>
          </header>

          {loading ? (
            <div className="text-center p-20">
              <div className="w-12 h-12 border-4 border-medical-blue border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500 font-semibold">Loading your notifications...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-6 rounded-xl text-red-600 text-center border border-red-100">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center shadow-sm">
              <Bell size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-bold text-gray-800">No Notifications</h3>
              <p className="text-gray-500">You have no pending doctor access requests or logs.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AnimatePresence>
                {notifications.map((log) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={log.id} 
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-50 text-medical-blue rounded-full flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100">
                            Dr.
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 text-sm">
                              Dr. {log.doctor_name}
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              UPAHAAR ID: <span className="font-mono font-semibold">{log.doctor_upahaar_id || 'N/A'}</span>
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                              <Eye size={12} /> Requested via {log.method === 'QR_SCAN' ? 'QR Code' : log.method === 'FACE_SCAN' ? 'Facial Recognition' : 'Manual Lookup'}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                          log.method === 'QR_SCAN'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'PENDING'
                              ? 'bg-yellow-100 text-yellow-700'
                              : log.status === 'APPROVED' || log.status === 'ACKNOWLEDGED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                        }`}>
                          {log.method === 'QR_SCAN' 
                            ? 'Emergency Access' 
                            : log.status === 'PENDING'
                              ? 'Awaiting your approval'
                              : log.status === 'APPROVED' || log.status === 'ACKNOWLEDGED'
                                ? 'Access Granted'
                                : 'Access Terminated'}
                        </span>
                      </div>

                      {/* Shared Info */}
                      <div className="space-y-2.5 py-4 border-t border-b border-gray-100 my-4 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 flex items-center gap-1"><CheckCircle2 size={14} className="text-gray-400" /> Access requested</span>
                          <span className="font-medium text-gray-700">Clinical timeline</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 flex items-center gap-1"><Clock size={14} className="text-gray-400" /> Requested at</span>
                          <span className="font-medium text-gray-800">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 flex items-center gap-1"><ShieldCheck size={14} className="text-gray-400" /> Data shared</span>
                          <span className="font-medium text-gray-800">Timeline • Meds • Vitals</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      {log.status === 'PENDING' && log.method !== 'QR_SCAN' ? (
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleNotificationAction(log.id, 'acknowledge')}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors text-xs shadow-sm"
                          >
                            Approve access
                          </button>
                          <button 
                            onClick={() => handleNotificationAction(log.id, 'revoke')}
                            className="flex-1 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl transition-colors text-xs"
                          >
                            Revoke
                          </button>
                        </div>
                      ) : log.status !== 'REVOKED' ? (
                        <div className="flex justify-between items-center">
                          <span className="text-green-600 font-semibold text-xs flex items-center gap-1">
                            ✓ Active Access
                          </span>
                          <button 
                            onClick={() => handleNotificationAction(log.id, 'revoke')}
                            className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold rounded-lg transition-colors text-xs"
                            title="Terminate profile access rights for this doctor"
                          >
                            Terminate Access
                          </button>
                        </div>
                      ) : (
                        <span className="text-red-500 font-semibold italic text-xs">Access Blocked</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
