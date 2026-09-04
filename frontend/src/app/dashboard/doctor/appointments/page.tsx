'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, 
  User, CheckCircle2, AlertCircle, X, Edit3, Trash2, RotateCcw, AlertTriangle, Filter, Search
} from 'lucide-react';
import DoctorSidebar from '../../../components/DoctorSidebar';

interface Patient {
  id: string;
  full_name: string;
  upahaar_id: string;
  phone?: string;
  email?: string;
}

interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  patient_upahaar_id?: string;
  patient_phone?: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration_minutes: number;
  notes?: string;
  reminder_offset: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  created_at?: string;
}

export default function DoctorAppointmentsPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form Fields
  const [formPatientId, setFormPatientId] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formTime, setFormTime] = useState('10:00');
  const [formDuration, setFormDuration] = useState('30');
  const [formNotes, setFormNotes] = useState('');
  const [formReminder, setFormReminder] = useState('30m');
  const [formStatus, setFormStatus] = useState<'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled'>('Scheduled');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const fetchAppointments = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/appointments?month=${month + 1}&year=${year}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      } else {
        setError('Failed to load appointments.');
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      setError('Connection error while fetching appointments.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    const token = localStorage.getItem('upahaar_token');
    if (!token) return;
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/registered-citizens`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setPatients(data.citizens || []);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchPatients();
  }, [month, year]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Open modal for new appointment on a specific date
  const handleOpenAddModal = (dateStr?: string) => {
    const defaultDate = dateStr || new Date().toISOString().split('T')[0];
    setSelectedAppointment(null);
    setIsEditing(false);
    setFormPatientId(patients.length > 0 ? patients[0].id : '');
    setFormTitle('Consultation');
    setFormDate(defaultDate);
    setFormTime('10:00');
    setFormDuration('30');
    setFormNotes('');
    setFormReminder('30m');
    setFormStatus('Scheduled');
    setFormError(null);
    setShowModal(true);
  };

  // Open modal to view/edit existing appointment
  const handleOpenEditModal = (appt: Appointment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedAppointment(appt);
    setIsEditing(true);
    setFormPatientId(appt.patient_id);
    setFormTitle(appt.title);
    setFormDate(appt.date);
    setFormTime(appt.time);
    setFormDuration(String(appt.duration_minutes || 30));
    setFormNotes(appt.notes || '');
    setFormReminder(appt.reminder_offset || '30m');
    setFormStatus(appt.status);
    setFormError(null);
    setShowModal(true);
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formPatientId) {
      setFormError('Please select a patient.');
      return;
    }
    if (!formTitle.trim()) {
      setFormError('Appointment title is required.');
      return;
    }
    if (!formDate) {
      setFormError('Appointment date is required.');
      return;
    }
    if (!formTime) {
      setFormError('Appointment time is required.');
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('upahaar_token');

    const payload = {
      patient_id: formPatientId,
      title: formTitle.trim(),
      date: formDate,
      time: formTime,
      duration_minutes: parseInt(formDuration),
      notes: formNotes.trim(),
      reminder_offset: formReminder,
      status: formStatus
    };

    try {
      const url = selectedAppointment
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/appointments/${selectedAppointment.id}`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/appointments`;

      const method = selectedAppointment ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMsg(selectedAppointment ? 'Appointment updated successfully!' : 'Appointment scheduled successfully!');
        setShowModal(false);
        fetchAppointments();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setFormError(data.message || 'Failed to save appointment');
      }
    } catch (err) {
      setFormError('Server connection error. Failed to save appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelAppointment = async (apptId: string) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    const token = localStorage.getItem('upahaar_token');
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/doctors/appointments/${apptId}/cancel`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (response.ok) {
        setSuccessMsg('Appointment cancelled.');
        setShowModal(false);
        fetchAppointments();
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert('Failed to cancel appointment');
      }
    } catch (err) {
      console.error('Failed to cancel appointment:', err);
    }
  };

  // Build Month Days Grid
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sun
  
  // Previous month padding days
  const prevMonthDays = new Date(year, month, 0).getDate();
  const paddingDaysBefore = Array.from({ length: firstDayOfWeek }, (_, i) => ({
    dayNumber: prevMonthDays - firstDayOfWeek + i + 1,
    isCurrentMonth: false,
    dateStr: ''
  }));

  // Current month days
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return {
      dayNumber: day,
      isCurrentMonth: true,
      dateStr: `${year}-${monthStr}-${dayStr}`
    };
  });

  // Next month padding days to fill 5 or 6 weeks (35 or 42 cells)
  const totalCellsSoFar = paddingDaysBefore.length + currentMonthDays.length;
  const totalGridCells = totalCellsSoFar > 35 ? 42 : 35;
  const paddingDaysAfter = Array.from({ length: totalGridCells - totalCellsSoFar }, (_, i) => ({
    dayNumber: i + 1,
    isCurrentMonth: false,
    dateStr: ''
  }));

  const allGridCells = [...paddingDaysBefore, ...currentMonthDays, ...paddingDaysAfter];

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter appointments
  const filteredAppointments = appointments.filter(a => {
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    const matchesSearch = 
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.patient_upahaar_id && a.patient_upahaar_id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Map appointments by date string
  const appointmentsByDate: Record<string, Appointment[]> = {};
  filteredAppointments.forEach(a => {
    if (!appointmentsByDate[a.date]) {
      appointmentsByDate[a.date] = [];
    }
    appointmentsByDate[a.date].push(a);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40';
      case 'Completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-800/40';
      case 'Cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 border-red-200 dark:border-red-800/40';
      case 'Rescheduled':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border-amber-200 dark:border-amber-800/40';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-300">
      <DoctorSidebar activePage="appointments" />

      <main className="flex-1 p-4 sm:p-6 lg:p-10 flex flex-col gap-6 max-w-7xl mx-auto w-full">
        
        {/* Header Ribbon Banner */}
        <header className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2.5">
              <CalendarIcon size={26} className="text-medical-blue dark:text-blue-400" /> Doctor Appointment Scheduler
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage patient consultations, schedule new appointments, reschedule, and set automated reminders.
            </p>
          </div>

          <button
            onClick={() => handleOpenAddModal()}
            className="px-5 py-2.5 bg-medical-blue hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 text-sm shrink-0 cursor-pointer"
          >
            <Plus size={18} /> Schedule Appointment
          </button>
        </header>

        {/* Success Alert Toast */}
        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold shadow-sm"
            >
              <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              {successMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Calendar Navigation & Filters */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4">
          
          {/* Month Navigation Controls */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-700 dark:text-gray-300 cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 transition text-gray-700 dark:text-gray-300 cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <h2 className="text-xl font-extrabold text-gray-850 dark:text-white tracking-tight min-w-[180px] text-center">
              {monthNames[month]} {year}
            </h2>

            <button
              onClick={handleToday}
              className="px-3.5 py-1.5 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Search & Status Filter */}
          <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
            <div className="relative flex-1 lg:w-56">
              <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-gray-500" size={16} />
              <input
                type="text"
                placeholder="Filter by title/patient..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-white outline-none text-xs"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-950 p-1 rounded-xl border border-gray-200 dark:border-slate-800 text-xs">
              {['ALL', 'Scheduled', 'Rescheduled', 'Completed', 'Cancelled'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white dark:bg-slate-800 text-medical-blue dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* MS Teams Style Calendar Month Grid */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-gray-150 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-950/80 text-center font-extrabold text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 py-3">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Month Days Matrix */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-slate-800/60 bg-gray-100/30 dark:bg-slate-950/40">
            {allGridCells.map((cell, idx) => {
              const isToday = cell.dateStr === todayStr;
              const cellAppts = cell.dateStr ? (appointmentsByDate[cell.dateStr] || []) : [];

              return (
                <div
                  key={idx}
                  onClick={() => cell.isCurrentMonth && handleOpenAddModal(cell.dateStr)}
                  className={`min-h-[110px] sm:min-h-[130px] p-2 flex flex-col justify-start relative transition-colors ${
                    cell.isCurrentMonth
                      ? 'bg-white dark:bg-slate-900 hover:bg-blue-50/30 dark:hover:bg-slate-800/40 cursor-pointer'
                      : 'bg-gray-50/50 dark:bg-slate-950/60 text-gray-300 dark:text-slate-800 pointer-events-none'
                  }`}
                >
                  {/* Top Day Number Row */}
                  <div className="flex justify-between items-center mb-1.5">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-medical-blue text-white shadow-md'
                          : cell.isCurrentMonth
                          ? 'text-gray-700 dark:text-gray-300'
                          : 'text-gray-400 dark:text-slate-700'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {cellAppts.length > 0 && (
                      <span className="text-[10px] font-mono font-bold bg-blue-50 dark:bg-slate-800 text-medical-blue dark:text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-100 dark:border-slate-700">
                        {cellAppts.length} {cellAppts.length === 1 ? 'appt' : 'appts'}
                      </span>
                    )}
                  </div>

                  {/* Appointments Cards inside Date Cell */}
                  <div className="space-y-1 overflow-y-auto max-h-[85px] scrollbar-none">
                    {cellAppts.map(appt => {
                      const badgeClass = getStatusBadge(appt.status);

                      return (
                        <div
                          key={appt.id}
                          onClick={(e) => handleOpenEditModal(appt, e)}
                          className={`p-1.5 rounded-lg border text-[11px] transition-all hover:scale-[1.02] shadow-2xs font-sans ${badgeClass}`}
                          title={`${appt.title} - ${appt.patient_name} (${appt.time})`}
                        >
                          <div className="flex items-center justify-between font-bold truncate">
                            <span className="truncate">{appt.time} • {appt.patient_name}</span>
                          </div>
                          <div className="text-[10px] opacity-90 truncate font-normal">
                            {appt.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </main>

      {/* Add / Edit Appointment Modal Pop-up */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col"
            >
              {/* Modal Top Header Bar */}
              <div className="bg-medical-dark text-white p-5 px-6 flex justify-between items-center shrink-0 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <CalendarIcon className="text-medical-blue" size={24} />
                  <div>
                    <h3 className="font-bold text-base text-white">
                      {isEditing ? 'Manage Appointment' : 'Schedule New Appointment'}
                    </h3>
                    <p className="text-xs text-gray-300">
                      {isEditing ? `Appointment ID: ${selectedAppointment?.id.substring(0, 8)}...` : 'Enter appointment parameters'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-full text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveAppointment} className="p-6 space-y-4 text-xs">
                
                {formError && (
                  <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-2xl flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0 text-red-500" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Patient Selection Dropdown */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Select Patient *</label>
                  <select
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-850 dark:text-white outline-none font-medium"
                    value={formPatientId}
                    onChange={e => setFormPatientId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.upahaar_id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title / Reason */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Appointment Title / Reason *</label>
                  <input
                    type="text"
                    placeholder="e.g. Follow-up consultation, Routine checkup"
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-850 dark:text-white outline-none font-medium"
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    required
                  />
                </div>

                {/* Date & Time Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Appointment Date *</label>
                    <input
                      type="date"
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-850 dark:text-white outline-none font-medium"
                      value={formDate}
                      onChange={e => setFormDate(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Appointment Time *</label>
                    <input
                      type="time"
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-850 dark:text-white outline-none font-medium"
                      value={formTime}
                      onChange={e => setFormTime(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Duration & Reminder Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Duration</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-850 dark:text-white outline-none font-medium"
                      value={formDuration}
                      onChange={e => setFormDuration(e.target.value)}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Automated Reminder</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-850 dark:text-white outline-none font-medium"
                      value={formReminder}
                      onChange={e => setFormReminder(e.target.value)}
                    >
                      <option value="10m">10 minutes before</option>
                      <option value="30m">30 minutes before</option>
                      <option value="1h">1 hour before</option>
                      <option value="1d">1 day before</option>
                      <option value="NONE">No reminder</option>
                    </select>
                  </div>
                </div>

                {/* Status Dropdown (when editing) */}
                {isEditing && (
                  <div>
                    <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Appointment Status</label>
                    <select
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-850 dark:text-white outline-none font-medium"
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                    >
                      <option value="Scheduled">Scheduled</option>
                      <option value="Rescheduled">Rescheduled</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Optional Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Add clinical instructions or preparation notes..."
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950 text-gray-850 dark:text-white outline-none font-medium resize-none"
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                  />
                </div>

                {/* Buttons Action Row */}
                <div className="pt-3 flex gap-3">
                  {isEditing && selectedAppointment && selectedAppointment.status !== 'Cancelled' && (
                    <button
                      type="button"
                      onClick={() => handleCancelAppointment(selectedAppointment.id)}
                      className="px-4 py-2.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold rounded-xl transition text-xs cursor-pointer"
                    >
                      Cancel Appointment
                    </button>
                  )}

                  <div className="flex-1 flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-bold rounded-xl transition text-xs cursor-pointer"
                    >
                      Close
                    </button>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-6 py-2.5 bg-medical-blue hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-sm text-xs disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? 'Saving...' : isEditing ? 'Update Appointment' : 'Save Appointment'}
                    </button>
                  </div>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
