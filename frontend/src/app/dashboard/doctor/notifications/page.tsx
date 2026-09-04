'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Clock, CheckCircle2, ShieldAlert, X, Calendar, AlertCircle, Check, Trash2, User
} from 'lucide-react';
import DoctorSidebar from '../../../components/DoctorSidebar';

interface DoctorNotification {
  id: string;
  doctor_id: string;
  appointment_id?: string;
  title: string;
  message: string;
  type: 'SCHEDULED' | 'REMINDER' | 'RESCHEDULED' | 'CANCELLED';
  is_read: number;
  created_at: string;
}

export default function DoctorNotificationsPage() {
  const [notifications, setNotifications] = useState<DoctorNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) return;
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      } else {
        setError('Failed to fetch doctor notifications');
      }
    } catch (err) {
      setError('Connection error fetching notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id: string) => {
    const token = localStorage.getItem('upahaar_token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    const token = localStorage.getItem('upahaar_token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleDeleteNotification = async () => {
    if (!deletingId) return;
    const token = localStorage.getItem('upahaar_token');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/notifications/${deletingId}`, {
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
      setDeletingId(null);
    }
  };

  // Urgent reminder unread pop-up
  const unreadReminders = notifications.filter(n => n.type === 'REMINDER' && n.is_read === 0);

  return (
    <div className="min-h-[100dvh] bg-gray-50 dark:bg-slate-950 flex flex-col md:flex-row">
      <DoctorSidebar activePage="notifications" />

      <main className="flex-1 p-6 lg:p-10">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Header Banner matching Patient Notifications */}
          <header className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2.5">
                <Bell size={24} className="text-medical-blue dark:text-blue-400 animate-swing" /> Doctor Notifications
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {unreadCount} unread
                  </span>
                )}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
                Review appointment alerts, automated reminders, and schedule updates.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 border border-blue-200 dark:border-blue-800 text-medical-blue dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-800 font-bold rounded-xl transition-all text-xs shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} /> Mark All as Read
              </button>
            )}
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
              <p className="text-gray-500 dark:text-gray-400 text-sm">You have no appointment notifications or alerts at this time.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Notifications Log ({notifications.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence>
                  {notifications.map((notif) => {
                    const isUnread = notif.is_read === 0;

                    let cardStyle = "bg-white border-gray-100 dark:bg-slate-900 dark:border-slate-800";
                    let badgeStyle = "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300";
                    let badgeText: string = notif.type;

                    if (notif.type === 'REMINDER') {
                      cardStyle = "bg-gradient-to-br from-amber-50/50 to-white border-amber-200 dark:from-amber-950/40 dark:to-slate-900 dark:border-amber-500/30 shadow-sm";
                      badgeStyle = "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
                      badgeText = "Appointment Reminder";
                    } else if (notif.type === 'CANCELLED') {
                      cardStyle = "bg-gradient-to-br from-red-50/40 to-white border-red-200 dark:from-red-950/40 dark:to-slate-900 dark:border-red-500/30 shadow-sm";
                      badgeStyle = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";
                      badgeText = "Cancelled";
                    } else if (notif.type === 'RESCHEDULED') {
                      cardStyle = "bg-gradient-to-br from-purple-50/40 to-white border-purple-200 dark:from-purple-950/40 dark:to-slate-900 dark:border-purple-500/30 shadow-sm";
                      badgeStyle = "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300";
                      badgeText = "Rescheduled";
                    } else if (notif.type === 'SCHEDULED') {
                      cardStyle = "bg-gradient-to-br from-emerald-50/40 to-white border-emerald-200 dark:from-emerald-950/40 dark:to-slate-900 dark:border-emerald-500/30 shadow-sm";
                      badgeStyle = "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
                      badgeText = "Scheduled";
                    }

                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={notif.id}
                        className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between relative transition-all duration-300 ${cardStyle} ${
                          isUnread ? 'ring-2 ring-medical-blue/30 dark:ring-blue-500/30' : ''
                        }`}
                      >
                        {/* Red Cross Delete Button */}
                        <button
                          onClick={() => { setDeletingId(notif.id); setShowDeleteConfirm(true); }}
                          className="absolute top-4 right-4 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 p-1.5 rounded-full transition-all duration-200 cursor-pointer"
                          title="Delete notification"
                        >
                          <X size={16} />
                        </button>

                        <div>
                          <div className="flex justify-between items-start gap-4 mb-3 pr-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-50 dark:bg-slate-800 text-medical-blue dark:text-blue-400 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100 dark:border-slate-700">
                                <Calendar size={18} />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-800 dark:text-white text-sm flex items-center gap-2">
                                  {notif.title}
                                  {isUnread && (
                                    <span className="w-2 h-2 rounded-full bg-medical-blue dark:bg-blue-400 inline-block animate-ping"></span>
                                  )}
                                </h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${badgeStyle}`}>
                                  {badgeText}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Message Body */}
                          <div className="py-3 border-t border-b border-gray-100 dark:border-slate-800 my-3 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            {notif.message}
                          </div>
                        </div>

                        <div className="mt-2 flex justify-between items-center text-xs">
                          <span className="text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Clock size={13} /> {new Date(notif.created_at).toLocaleString()}
                          </span>

                          {isUnread && (
                            <button
                              onClick={() => handleMarkRead(notif.id)}
                              className="px-3 py-1 bg-medical-blue hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-[11px] cursor-pointer"
                            >
                              Mark as Read
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Pop-up Notification for Urgent Unread Reminders */}
      <AnimatePresence>
        {unreadReminders.length > 0 && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="max-w-md w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-150 flex flex-col"
            >
              {/* Blue Ribbon Header */}
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-slate-900 dark:to-slate-950 p-6 text-white text-center relative flex flex-col items-center">
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-3 border border-white/20">
                  <Bell size={32} className="text-white animate-bounce" />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight">
                  Upcoming Appointment Reminder
                </h2>
                <div className="bg-white/20 text-white border border-white/30 text-xs px-3 py-1 rounded-full mt-2 font-mono font-semibold">
                  NOTIFICATION ALERT
                </div>
              </div>

              {/* White Box with message */}
              <div className="p-6 bg-white text-center flex flex-col items-center">
                <div className="bg-gray-50 border border-gray-150 rounded-2xl p-5 w-full text-gray-700 font-medium text-sm mb-6 leading-relaxed">
                  {unreadReminders[0].message}
                </div>

                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => handleMarkRead(unreadReminders[0].id)}
                    className="flex-1 py-3 bg-medical-blue hover:bg-blue-700 active:scale-95 text-white font-extrabold rounded-xl transition-all shadow-md text-sm cursor-pointer"
                  >
                    Acknowledge
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
              <h3 className="text-lg font-bold text-gray-800 mb-2">Delete Notification?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete this notification record?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold rounded-xl transition-colors text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteNotification}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors text-xs shadow-sm"
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
