'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Scan, Users, Calendar, Bell, Settings, Shield } from 'lucide-react';

interface DoctorSidebarProps {
  activePage: 'workspace' | 'patients' | 'appointments' | 'notifications' | 'settings';
}

export default function DoctorSidebar({ activePage }: DoctorSidebarProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      const token = localStorage.getItem('upahaar_token');
      if (!token) return;
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/notifications`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Error fetching doctor notification count:', err);
      }
    };

    fetchUnreadNotifications();
    const interval = setInterval(fetchUnreadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="w-full md:w-64 bg-medical-dark text-white p-6 flex flex-col min-h-[10vh] md:min-h-screen justify-between shrink-0">
      <div>
        <div className="flex items-center gap-2 mb-8">
          <Shield className="text-medical-blue shrink-0" size={28} />
          <h2 className="text-2xl font-bold tracking-tight">UPAHAAR</h2>
        </div>
        <nav className="space-y-4">
          <Link
            href="/dashboard/doctor"
            className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'workspace'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <Scan size={20} /> Doctor Workspace
          </Link>

          <Link
            href="/dashboard/doctor/patients"
            className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'patients'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <Users size={20} /> My Patients
          </Link>

          <Link
            href="/dashboard/doctor/appointments"
            className={`flex items-center gap-3 p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'appointments'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <Calendar size={20} /> Appointments
          </Link>

          <Link
            href="/dashboard/doctor/notifications"
            className={`flex items-center justify-between p-3 rounded-lg font-semibold transition-colors ${
              activePage === 'notifications'
                ? 'bg-white/10 text-white'
                : 'hover:bg-white/5 text-gray-300'
            }`}
          >
            <span className="flex items-center gap-3">
              <Bell size={20} /> Notifications
            </span>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unreadCount}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/doctor/settings"
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
