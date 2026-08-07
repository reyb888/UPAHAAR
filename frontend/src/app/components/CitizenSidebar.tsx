'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, QrCode, Activity, Settings, ChevronDown, MapPin, Syringe, Stethoscope } from 'lucide-react';

interface CitizenSidebarProps {
  activePage: 'timeline' | 'qr-card' | 'vitals' | 'pharmacy-finder' | 'vaccines' | 'settings';
}

export default function CitizenSidebar({ activePage }: CitizenSidebarProps) {
  const [showAdvancedTools, setShowAdvancedTools] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('upahaar_advanced_tools_open');
      // Default to true if user is on one of the advanced tools pages, or if explicitly saved as 'true'
      if (activePage === 'pharmacy-finder' || activePage === 'vaccines') return true;
      return stored === 'true';
    }
    return false;
  });

  const toggleAdvancedTools = () => {
    setShowAdvancedTools(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('upahaar_advanced_tools_open', String(next));
      }
      return next;
    });
  };

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

          {/* Advanced Tools Dropdown */}
          <div>
            <button
              onClick={toggleAdvancedTools}
              className={`w-full flex items-center justify-between p-3 rounded-lg font-semibold transition-colors ${
                activePage === 'pharmacy-finder' || activePage === 'vaccines'
                  ? 'bg-white/10 text-white'
                  : 'hover:bg-white/5 text-gray-300'
              }`}
            >
              <span className="flex items-center gap-3">
                <Stethoscope size={20} /> Advanced Tools
              </span>
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${showAdvancedTools ? 'rotate-180' : ''}`}
              />
            </button>
            {showAdvancedTools && (
              <div className="ml-4 mt-1 space-y-1 border-l border-white/10 pl-3">
                <Link
                  href="/dashboard/citizen/pharmacy-finder"
                  className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors text-sm font-medium ${
                    activePage === 'pharmacy-finder'
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <MapPin size={16} /> Nearby Pharmacies
                </Link>
                <Link
                  href="/dashboard/citizen/vaccines"
                  className={`flex items-center gap-2 p-2.5 rounded-lg transition-colors text-sm font-medium ${
                    activePage === 'vaccines'
                      ? 'bg-white/15 text-white font-bold'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Syringe size={16} /> Vaccine Scheduler
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
      <div className="mt-auto pt-6 border-t border-white/10">
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
      </div>
    </aside>
  );
}
