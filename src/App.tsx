/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Bell, 
  Clock, 
  Info, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  X,
  Pill,
  Calendar,
  Camera,
  Image as ImageIcon,
  ChevronRight,
  Volume2,
  VolumeX,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parse, isAfter, addMinutes, startOfMinute } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Markdown from 'react-markdown';
import { Medicine, MedicineInfo, ImageAnalysisResult } from './types';
import { getMedicineInfo, analyzeMedicineImage } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const saved = localStorage.getItem('meds');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<MedicineInfo | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysisResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Medicine | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem('meds', JSON.stringify(medicines));
  }, [medicines]);

  // Alarm System
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const currentTime = format(now, 'HH:mm');
      const currentDay = format(now, 'EEE');

      medicines.forEach(med => {
        if (med.time === currentTime && med.days.includes(currentDay)) {
          // Check if already taken today
          const lastTakenDate = med.lastTaken ? new Date(med.lastTaken) : null;
          const isToday = lastTakenDate && format(lastTakenDate, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
          
          if (!isToday && !activeAlarm) {
            setActiveAlarm(med);
          }
        }
      });
    };

    const interval = setInterval(checkAlarms, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [medicines, activeAlarm]);

  // Audio handling
  useEffect(() => {
    if (activeAlarm && !isMuted) {
      if (!audioRef.current) {
        audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audioRef.current.loop = true;
      }
      audioRef.current.play().catch(e => console.error("Audio play failed", e));
    } else {
      audioRef.current?.pause();
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [activeAlarm, isMuted]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchResult(null);
    const info = await getMedicineInfo(searchQuery);
    setSearchResult(info);
    setIsSearching(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setImageAnalysis(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        const result = await analyzeMedicineImage(base64String, file.type);
        setImageAnalysis(result);
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing image:", error);
      setIsAnalyzing(false);
    }
  };

  const addMedicine = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newMed: Medicine = {
      id: crypto.randomUUID(),
      name: formData.get('name') as string,
      dosage: formData.get('dosage') as string,
      time: formData.get('time') as string,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // Default to all days for simplicity
      info: '',
    };
    setMedicines([...medicines, newMed]);
    setShowAddModal(false);
  };

  const deleteMedicine = (id: string) => {
    setMedicines(medicines.filter(m => m.id !== id));
  };

  const markAsTaken = (id: string) => {
    setMedicines(medicines.map(m => 
      m.id === id ? { ...m, lastTaken: new Date().toISOString() } : m
    ));
    setActiveAlarm(null);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <Pill className="text-white w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">MedSafe</h1>
          </div>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-slate-400" /> : <Volume2 className="w-5 h-5 text-emerald-600" />}
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Search & Scan Section */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-emerald-500" />
              Check Medicine Info
            </h2>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter medicine name"
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <button 
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {isSearching ? '...' : 'Check'}
              </button>
            </form>

            <AnimatePresence mode="wait">
              {searchResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-6 space-y-4 border-t border-slate-100 pt-6"
                >
                  <div className="flex items-center gap-2">
                    {searchResult.isSafe ? (
                      <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Generally Safe
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium">
                        <AlertCircle className="w-4 h-4" /> Use with Caution
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Benefits</h3>
                      <p className="text-slate-700 text-sm leading-relaxed">{searchResult.benefits}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">How to Use</h3>
                      <p className="text-slate-700 text-sm leading-relaxed">{searchResult.usage}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 h-full">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-emerald-500" />
              Scan Prescription
            </h2>
            
            <div className="relative group">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-full bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl py-8 flex flex-col items-center justify-center gap-3 group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-all">
                <div className="bg-white p-3 rounded-full shadow-sm">
                  <Upload className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-700">Upload or Take Photo</p>
                  <p className="text-xs text-slate-400">Prescription or Medicine Box</p>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 flex items-center justify-center gap-3 text-slate-500"
                >
                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm font-medium">Analyzing image...</p>
                </motion.div>
              )}

              {imageAnalysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 space-y-4 border-t border-slate-100 pt-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900">{imageAnalysis.medicineName}</h3>
                    {imageAnalysis.isPrescription && (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Prescription</span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Benefits</h3>
                      <p className="text-slate-700 text-sm leading-relaxed">{imageAnalysis.benefits}</p>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                      <h3 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Prescription Basis</h3>
                      <p className="text-amber-800 text-sm leading-relaxed">{imageAnalysis.prescriptionBasis}</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* Reminders Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              Your Schedule
            </h2>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 text-emerald-600 font-medium hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" /> Add New
            </button>
          </div>

          <div className="space-y-3">
            {medicines.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-300">
                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No medicine reminders set yet.</p>
              </div>
            ) : (
              medicines.map((med) => (
                <motion.div 
                  layout
                  key={med.id}
                  className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-3 rounded-2xl">
                      <Pill className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{med.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {med.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {med.dosage}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteMedicine(med.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Add Reminder</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={addMedicine} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Medicine Name</label>
                  <input 
                    name="name" 
                    required 
                    placeholder="e.g. Aspirin"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Dosage</label>
                    <input 
                      name="dosage" 
                      required 
                      placeholder="e.g. 1 Tablet"
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Time</label>
                    <input 
                      name="time" 
                      type="time" 
                      required 
                      className="w-full bg-slate-50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                >
                  Save Reminder
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alarm Modal */}
      <AnimatePresence>
        {activeAlarm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-500/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="bg-white w-full max-w-sm rounded-[3rem] p-10 text-center relative z-10 shadow-2xl"
            >
              <div className="bg-emerald-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <Bell className="w-12 h-12 text-emerald-600" />
              </div>
              <h2 className="text-sm font-bold text-emerald-600 uppercase tracking-[0.2em] mb-2">Time for Medicine</h2>
              <h3 className="text-3xl font-black text-slate-900 mb-2">{activeAlarm.name}</h3>
              <p className="text-slate-500 mb-10 text-lg">Dosage: <span className="font-bold text-slate-900">{activeAlarm.dosage}</span></p>
              
              <div className="space-y-4">
                <button 
                  onClick={() => markAsTaken(activeAlarm.id)}
                  className="w-full bg-emerald-500 text-white py-5 rounded-[2rem] font-bold text-xl hover:bg-emerald-600 shadow-xl shadow-emerald-500/30 transition-all active:scale-[0.95]"
                >
                  I've Taken It
                </button>
                <button 
                  onClick={() => setActiveAlarm(null)}
                  className="w-full bg-slate-100 text-slate-500 py-4 rounded-[2rem] font-bold hover:bg-slate-200 transition-all"
                >
                  Remind me in 5 mins
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
