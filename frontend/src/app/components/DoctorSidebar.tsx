'use client';

import Link from 'next/link';
import { Scan, Settings, Shield } from 'lucide-react';

interface DoctorSidebarProps {
  activePage: 'workspace' | 'settings';
}

export default function DoctorSidebar({ activePage }: DoctorSidebarProps) {
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
