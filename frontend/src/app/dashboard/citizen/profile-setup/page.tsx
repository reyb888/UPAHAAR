'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';

export default function ProfileSetup() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [bloodGroup, setBloodGroup] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [visionLeft, setVisionLeft] = useState('');
  const [visionRight, setVisionRight] = useState('');
  const [identifyingMarks, setIdentifyingMarks] = useState('');
  const [otherDefects, setOtherDefects] = useState('');

  // Complex Objects
  const [allergies, setAllergies] = useState({ peanuts: false, dust: false, pollen: false, penicillin: false, other: '' });
  const [hearing, setHearing] = useState({ mildDeafness: false, fullDeafness: false });
  const [mentalIllness, setMentalIllness] = useState({ anxiety: false, depression: false, adhd: false, other: '' });
  const [respiratory, setRespiratory] = useState({ asthma: false, copd: false, other: '' });
  const [nervousSystem, setNervousSystem] = useState({ epilepsy: false, parkinsons: false, other: '' });
  const [heartProblem, setHeartProblem] = useState({ hypertension: false, arrhythmia: false, other: '' });
  
  // Family History (Simple implementation)
  const [familyHistory, setFamilyHistory] = useState({ relation: 'None', disease: '' });

  // Emergency Contacts
  const [emergencyContacts, setEmergencyContacts] = useState<Array<{ name: string; phone: string; relation: string }>>([
    { name: '', phone: '', relation: '' }
  ]);

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
          if (data.blood_group) setBloodGroup(data.blood_group);
          if (data.height_cm) setHeight(data.height_cm.toString());
          if (data.weight_kg) setWeight(data.weight_kg.toString());
          if (data.vision_left) setVisionLeft(data.vision_left);
          if (data.vision_right) setVisionRight(data.vision_right);
          
          if (data.identifying_features) {
            const parts = data.identifying_features.split(' | Other Defects: ');
            setIdentifyingMarks(parts[0]);
            if (parts[1]) setOtherDefects(parts[1]);
          }

          if (data.hearing_status) {
            try { setHearing(JSON.parse(data.hearing_status)); } catch(e){}
          }
          if (data.allergies) {
            try { setAllergies(JSON.parse(data.allergies)); } catch(e){}
          }
          if (data.family_history) {
            try { setFamilyHistory(JSON.parse(data.family_history)); } catch(e){}
          }
          if (data.mental_health) {
            try { setMentalIllness(JSON.parse(data.mental_health)); } catch(e){}
          }
          if (data.respiratory_disorders) {
            try { setRespiratory(JSON.parse(data.respiratory_disorders)); } catch(e){}
          }
          if (data.heart_problems) {
            try { setHeartProblem(JSON.parse(data.heart_problems)); } catch(e){}
          }
          if (data.nervous_disorders) {
            try { setNervousSystem(JSON.parse(data.nervous_disorders)); } catch(e){}
          }
          if (data.emergency_contacts) {
            try { 
              const parsed = JSON.parse(data.emergency_contacts);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setEmergencyContacts(parsed);
              }
            } catch(e){}
          }
        }
      } catch (err) {
        console.error('Failed to load profile details', err);
      }
    };
    fetchProfile();
  }, []);

  const addEmergencyContact = () => {
    setEmergencyContacts([...emergencyContacts, { name: '', phone: '', relation: '' }]);
  };

  const removeEmergencyContact = (index: number) => {
    if (emergencyContacts.length > 1) {
      setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
    } else {
      setEmergencyContacts([{ name: '', phone: '', relation: '' }]);
    }
  };

  const updateEmergencyContact = (index: number, field: 'name' | 'phone' | 'relation', value: string) => {
    const updated = emergencyContacts.map((contact, i) => {
      if (i === index) {
        return { ...contact, [field]: value };
      }
      return contact;
    });
    setEmergencyContacts(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const token = localStorage.getItem('upahaar_token');
    if (!token) {
      alert("No token found. Please login again.");
      return;
    }

    const payload = {
      blood_group: bloodGroup,
      height_cm: parseFloat(height) || null,
      weight_kg: parseFloat(weight) || null,
      vision_left: visionLeft,
      vision_right: visionRight,
      hearing_status: JSON.stringify(hearing),
      allergies,
      family_history: familyHistory,
      mental_health: mentalIllness,
      respiratory_disorders: respiratory,
      nervous_disorders: nervousSystem,
      heart_problems: heartProblem,
      identifying_features: identifyingMarks + (otherDefects ? ` | Other Defects: ${otherDefects}` : ''),
      emergency_contacts: emergencyContacts.filter(c => c.name.trim() || c.phone.trim() || c.relation.trim())
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/patients/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        alert("Profile saved successfully!");
        window.location.href = '/dashboard/citizen';
      } else {
        alert(data.message || 'Failed to save profile');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to backend server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
          <div className="bg-medical-blue p-8 text-white">
            <h1 className="text-3xl font-extrabold mb-2">Complete Your Medical Profile</h1>
            <p className="text-blue-100">Please provide detailed health information. You will only have to do this once.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* Section 1: Basic Vitals & Info */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Basic Vitals & Identification</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Blood Group</label>
                  <input type="text" required placeholder="e.g. O+, A-" className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-medical-blue outline-none" value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Height (cm)</label>
                  <input type="number" placeholder="175" className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-medical-blue outline-none" value={height} onChange={e => setHeight(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Weight (kg)</label>
                  <input type="number" placeholder="70" className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-medical-blue outline-none" value={weight} onChange={e => setWeight(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Birth / Identification Mark</label>
                  <input type="text" placeholder="e.g. Scar on left cheek, Mole on right arm" className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-medical-blue outline-none" value={identifyingMarks} onChange={e => setIdentifyingMarks(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Section 2: Sensory */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Sensory (Vision & Hearing)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hearing Issues</label>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="mildDeaf" checked={hearing.mildDeafness} onChange={e => setHearing({...hearing, mildDeafness: e.target.checked})} />
                    <label htmlFor="mildDeaf">Mild Deafness</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="fullDeaf" checked={hearing.fullDeafness} onChange={e => setHearing({...hearing, fullDeafness: e.target.checked})} />
                    <label htmlFor="fullDeaf">Full Deafness</label>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vision (Left Eye)</label>
                    <input type="text" placeholder="-1.5" className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-medical-blue outline-none" value={visionLeft} onChange={e => setVisionLeft(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Vision (Right Eye)</label>
                    <input type="text" placeholder="-1.5" className="w-full px-4 py-2 rounded-xl border focus:ring-2 focus:ring-medical-blue outline-none" value={visionRight} onChange={e => setVisionRight(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Allergies & Family History */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Allergies & Family History</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Allergies</label>
                  <div className="space-y-2 mb-3">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={allergies.peanuts} onChange={e => setAllergies({...allergies, peanuts: e.target.checked})} /> Peanuts</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={allergies.dust} onChange={e => setAllergies({...allergies, dust: e.target.checked})} /> Dust Mites</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={allergies.pollen} onChange={e => setAllergies({...allergies, pollen: e.target.checked})} /> Pollen</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={allergies.penicillin} onChange={e => setAllergies({...allergies, penicillin: e.target.checked})} /> Penicillin</label>
                  </div>
                  <input type="text" placeholder="Other allergies..." className="w-full px-4 py-2 rounded-lg border outline-none bg-white" value={allergies.other} onChange={e => setAllergies({...allergies, other: e.target.value})} />
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Family Disease History</label>
                  <select className="w-full px-4 py-2 rounded-lg border outline-none mb-3 bg-white" value={familyHistory.relation} onChange={e => setFamilyHistory({...familyHistory, relation: e.target.value})}>
                    <option value="None">None</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Grandparents">Grandparents</option>
                  </select>
                  {familyHistory.relation !== 'None' && (
                    <input type="text" placeholder="Describe disease (e.g. Diabetes)" className="w-full px-4 py-2 rounded-lg border outline-none bg-white" value={familyHistory.disease} onChange={e => setFamilyHistory({...familyHistory, disease: e.target.value})} />
                  )}
                </div>
              </div>
            </div>

            {/* Section 4: Systemic Conditions */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Systemic Conditions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Mental Illness */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Mental Illness</label>
                  <div className="space-y-2 mb-3">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={mentalIllness.anxiety} onChange={e => setMentalIllness({...mentalIllness, anxiety: e.target.checked})} /> Anxiety</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={mentalIllness.depression} onChange={e => setMentalIllness({...mentalIllness, depression: e.target.checked})} /> Depression</label>
                  </div>
                  <input type="text" placeholder="Other mental illness..." className="w-full px-4 py-2 rounded-lg border outline-none bg-white" value={mentalIllness.other} onChange={e => setMentalIllness({...mentalIllness, other: e.target.value})} />
                </div>

                {/* Respiratory */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Respiratory System</label>
                  <div className="space-y-2 mb-3">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={respiratory.asthma} onChange={e => setRespiratory({...respiratory, asthma: e.target.checked})} /> Asthma</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={respiratory.copd} onChange={e => setRespiratory({...respiratory, copd: e.target.checked})} /> COPD</label>
                  </div>
                  <input type="text" placeholder="Other respiratory issues..." className="w-full px-4 py-2 rounded-lg border outline-none bg-white" value={respiratory.other} onChange={e => setRespiratory({...respiratory, other: e.target.value})} />
                </div>

                {/* Heart */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Heart Problem</label>
                  <div className="space-y-2 mb-3">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={heartProblem.hypertension} onChange={e => setHeartProblem({...heartProblem, hypertension: e.target.checked})} /> Hypertension</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={heartProblem.arrhythmia} onChange={e => setHeartProblem({...heartProblem, arrhythmia: e.target.checked})} /> Arrhythmia</label>
                  </div>
                  <input type="text" placeholder="Other heart issues..." className="w-full px-4 py-2 rounded-lg border outline-none bg-white" value={heartProblem.other} onChange={e => setHeartProblem({...heartProblem, other: e.target.value})} />
                </div>

                {/* Nervous System */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Nervous System</label>
                  <div className="space-y-2 mb-3">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={nervousSystem.epilepsy} onChange={e => setNervousSystem({...nervousSystem, epilepsy: e.target.checked})} /> Epilepsy</label>
                  </div>
                  <input type="text" placeholder="Other nervous issues..." className="w-full px-4 py-2 rounded-lg border outline-none bg-white" value={nervousSystem.other} onChange={e => setNervousSystem({...nervousSystem, other: e.target.value})} />
                </div>

              </div>
            </div>

            {/* Other Defects */}
            <div>
               <label className="block text-sm font-semibold text-gray-700 mb-2">Any other defects?</label>
               <input type="text" placeholder="Describe any other medical defects not covered above" className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-medical-blue outline-none" value={otherDefects} onChange={e => setOtherDefects(e.target.value)} />
            </div>

            {/* Section 5: Emergency Contacts */}
            <div>
              <div className="flex items-center justify-between border-b pb-2 mb-4">
                <h2 className="text-xl font-bold text-gray-800">Emergency Contacts</h2>
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="flex items-center gap-1 text-sm bg-blue-50 text-medical-blue hover:bg-blue-100 px-3 py-1.5 rounded-xl font-bold transition-all border border-blue-100"
                >
                  <Plus size={16} /> Add Contact
                </button>
              </div>

              <div className="space-y-4">
                {emergencyContacts.map((contact, index) => (
                  <div key={index} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-200 relative flex flex-col md:flex-row gap-6 items-end hover:shadow-md transition-shadow">
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Jane Doe"
                        required
                        className="w-full px-4 py-2 rounded-xl border outline-none bg-white focus:ring-2 focus:ring-medical-blue"
                        value={contact.name}
                        onChange={e => updateEmergencyContact(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="flex-1 w-full">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 9876543210"
                        required
                        className="w-full px-4 py-2 rounded-xl border outline-none bg-white focus:ring-2 focus:ring-medical-blue"
                        value={contact.phone}
                        onChange={e => updateEmergencyContact(index, 'phone', e.target.value)}
                      />
                    </div>
                    <div className="w-full md:w-56">
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">Relation</label>
                      <select
                        className="w-full px-4 py-2 rounded-xl border outline-none bg-white focus:ring-2 focus:ring-medical-blue"
                        value={contact.relation}
                        onChange={e => updateEmergencyContact(index, 'relation', e.target.value)}
                        required
                      >
                        <option value="">Select Relation</option>
                        <option value="Spouse">Spouse</option>
                        <option value="Parent">Parent</option>
                        <option value="Sibling">Sibling</option>
                        <option value="Child">Child</option>
                        <option value="Relative">Relative</option>
                        <option value="Friend">Friend</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {emergencyContacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEmergencyContact(index)}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2.5 rounded-xl transition-colors shrink-0 mb-0.5"
                        title="Remove Contact"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <motion.button 
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-4 bg-medical-dark text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-900/20 disabled:opacity-50"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving Profile...' : 'Save Complete Profile'}
              </motion.button>
            </div>
            
          </form>
        </motion.div>
      </div>
    </div>
  );
}
