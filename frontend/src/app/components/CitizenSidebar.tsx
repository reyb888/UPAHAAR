'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, QrCode, Activity, Settings, Syringe, Bell } from 'lucide-react';

interface CitizenSidebarProps {
  activePage: 'timeline' | 'qr-card' | 'vitals' | 'vaccines' | 'settings' | 'notifications';
}

export default function CitizenSidebar({ activePage }: CitizenSidebarProps) {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const fetchPendingNotifications = async () => {
      const token = localStorage.getItem('upahaar_token');
      if (!token) return;
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const pending = (data.notifications || []).filter((n: any) => n.status === 'PENDING').length;
          setPendingCount(pending);
        }
      } catch (err) {
        console.error('Error fetching notification count:', err);
      }
    };
    fetchPendingNotifications();
    const interval = setInterval(fetchPendingNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-full md:w-64 bg-medical-dark text-white p-6 flex flex-col min-h-[10vh] md:min-h-screen justify-between shrink-0">
      <div>
        <h2 className="text-2xl font-bold mb-8">UPAHAAR</h2>
        <nav className="space-y-4">
          <Link
            href="/dashboard/citizen"
            className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'timeline'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <Clock size={20} /> My Timeline
          </Link>
          <Link
            href="/dashboard/citizen/qr-card"
            className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'qr-card'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <QrCode size={20} /> My QR Card
          </Link>
          <Link
            href="/dashboard/citizen/vitals"
            className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'vitals'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <Activity size={20} /> Vital Tracker
          </Link>
          <Link
            href="/dashboard/citizen/notifications"
            className={`flex items-center justify-between p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'notifications'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <span className="flex items-center gap-3">
              <Bell size={20} /> Notifications
            </span>
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/citizen/vaccines"
            className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'vaccines'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <Syringe size={20} /> Vaccine Scheduler
          </Link>
          <Link
            href="/dashboard/citizen/settings"
            className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'settings'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <Settings size={20} /> Settings
          </Link>
        </nav>
      </div>
    </aside>
  );
}
