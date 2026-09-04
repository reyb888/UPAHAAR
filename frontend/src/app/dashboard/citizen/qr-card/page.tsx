'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Phone, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import CitizenSidebar from '../../../components/CitizenSidebar';

export default function CitizenQRCard() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
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
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!profile?.upahaar_id || qrDataUrl) return;
    try {
      const dynamicImport = new Function('specifier', 'return import(specifier)');
      dynamicImport('qrcode')
        .then((QRCodeModule: any) => {
          const qrcode = QRCodeModule.default || QRCodeModule;
          return qrcode.toDataURL(profile.upahaar_id, { width: 600, margin: 2, errorCorrectionLevel: 'M' });
        })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: any) => {
          console.error('QR generation error:', err);
          setQrError(true);
        });
    } catch {
      setQrError(true);
    }
  }, [profile, qrDataUrl]);

  const getAllergiesString = () => {
    if (!profile?.allergies) return 'None reported';
    try {
      const parsed = JSON.parse(profile.allergies);
      const active = Object.keys(parsed).filter(k => k !== 'other' && parsed[k]);
      if (parsed.other) active.push(parsed.other);
      return active.length > 0 ? active.join(', ') : 'None reported';
    } catch {
      return 'None reported';
    }
  };

  const getEmergencyContacts = () => {
    if (!profile?.emergency_contacts) return [];
    try {
      const parsed = JSON.parse(profile.emergency_contacts);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 font-semibold animate-pulse">Loading secure medical ID...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 font-semibold">Failed to load profile. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <CitizenSidebar activePage="qr-card" />
      <div className="flex-1 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8">
          
          <div className="text-center">
            <Link href="/dashboard/citizen" className="text-sm font-bold text-medical-blue hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
            <h2 className="text-3xl font-extrabold text-gray-900">Your Health Card</h2>
            <p className="mt-2 text-sm text-gray-600">
              Show this QR to any authorized doctor for instant timeline access.
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="upahaar-card bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 relative"
          >
            {/* Card Header */}
            <div className="bg-gradient-to-r from-medical-blue to-medical-dark p-6 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-white/10 w-24 h-24 rounded-full blur-xl"></div>
              <Shield className="mx-auto mb-2 opacity-80" size={36} />
              <h3 className="text-2xl font-bold tracking-wider">UPAHAAR</h3>
              <p className="text-blue-200 text-sm uppercase tracking-widest mt-1 font-medium">Digital Medical Identity</p>
            </div>

            {/* User Info */}
            <div className="p-6 text-center border-b border-gray-100 bg-gray-50/50 flex flex-col items-center">
              {profile.face_photo_url && profile.face_photo_url !== 'dummy-url-for-now' ? (
                <img 
                  src={profile.face_photo_url} 
                  alt="Facial Recognition Photo" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md mb-3"
                />
              ) : (
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-3 shadow-inner">
                  <Shield className="text-medical-blue" size={36} />
                </div>
              )}
              <h4 className="text-2xl font-bold text-gray-800">{profile.full_name}</h4>
              <p className="text-gray-500 font-mono mt-1 tracking-widest text-lg">{profile.upahaar_id}</p>
            </div>

            {/* QR Code Placeholder */}
            <div className="p-8 flex justify-center bg-white">
              <div className="bg-white p-4 rounded-2xl shadow-[inset_0_-2px_10px_rgba(0,0,0,0.05)] border border-gray-200 inline-block relative hover:scale-105 transition-transform cursor-pointer">
                <div className="w-48 h-48 bg-gray-50 rounded-lg flex items-center justify-center relative overflow-hidden">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for ${profile.upahaar_id}`}
                      className="relative z-10 w-[150px] h-[150px]"
                    />
                  ) : (
                    <div className="relative z-10 flex flex-col items-center gap-2 px-3 text-center">
                      {qrError ? (
                        <>
                          <AlertCircle className="text-red-500" size={28} />
                          <p className="text-xs text-gray-500 font-medium">Could not generate QR.</p>
                          <p className="text-[10px] text-gray-400 font-mono break-all">{profile.upahaar_id}</p>
                        </>
                      ) : (
                        <div className="w-10 h-10 border-4 border-medical-blue border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Info */}
            <div className="upahaar-card-emergency bg-red-50 p-6 flex flex-col gap-4 border-t border-red-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle size={20} />
                  <span className="font-bold text-lg">Emergency Info</span>
                </div>
                {profile.blood_group ? (
                  <span className="bg-red-100 text-red-800 px-4 py-1.5 rounded-full text-sm font-bold border border-red-200 shadow-sm">
                    Blood: {profile.blood_group}
                  </span>
                ) : (
                  <span className="bg-orange-100 text-orange-800 px-4 py-1.5 rounded-full text-sm font-bold border border-orange-200 shadow-sm">
                    Profile Incomplete
                  </span>
                )}
              </div>
              
              <div className="text-sm text-red-800 space-y-2">
                <p className="bg-red-100/50 p-2 rounded-lg border border-red-100">
                  <strong className="block text-xs uppercase tracking-wide opacity-80">Allergies</strong> 
                  <span className="capitalize">{getAllergiesString()}</span>
                </p>
                <p className="flex items-center gap-2 bg-red-100/50 p-2 rounded-lg border border-red-100">
                  <Phone size={16} className="opacity-80 shrink-0" /> 
                  <span className="font-medium break-all">{profile.phone} (Primary Phone)</span>
                </p>
                
                {/* Emergency Contacts List */}
                {getEmergencyContacts().length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-200/50 space-y-2">
                    <strong className="block text-xs uppercase tracking-wide opacity-80 text-red-700">Emergency Contacts</strong>
                    {getEmergencyContacts().map((contact: any, index: number) => (
                      <div key={index} className="bg-red-100/30 p-2.5 rounded-lg border border-red-100/50 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-red-900 block">{contact.name}</span>
                          <span className="text-[10px] text-red-700/80 font-medium uppercase tracking-wider">{contact.relation}</span>
                        </div>
                        <a href={`tel:${contact.phone}`} className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-md transition-colors shadow-sm">
                          <Phone size={12} /> {contact.phone}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
