import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { User, LogOut, Check, Dumbbell, ShieldAlert, Sparkles, Flame, Trophy, Award, Landmark, ToggleLeft, ToggleRight } from 'lucide-react';
import { motion } from 'framer-motion';

// Side widgets integrated into the profile layout
import { AcademicBufferConfig } from './AcademicBufferConfig';
import { TrophyCabinetView } from './TrophyCabinetView';

const EQUIPMENT_CATEGORIES = [
  { label: 'Chest & Push', items: ['Flat Bench', 'Incline Bench', 'Decline Bench', 'Chest Press Machine', 'Pec Deck', 'Dip Bars'] },
  { label: 'Back & Pull', items: ['Pull-up Bar', 'Lat Pulldown', 'Seated Row', 'Assisted Pull-up Machine', 'Cable Machine'] },
  { label: 'Legs', items: ['Squat Rack', 'Leg Press', 'Hack Squat', 'Leg Extension', 'Leg Curl', 'Smith Machine'] },
  { label: 'Shoulders & Arms', items: ['Shoulder Press Machine', 'Preacher Curl Bench', 'EZ Bar'] },
  { label: 'Free Weights', items: ['Barbell', 'Dumbbells', 'Kettlebell', 'Trap Bar', 'Medicine Ball', 'Weight Plates'] },
  { label: 'Core & Functional', items: ['Ab Wheel', 'Resistance Bands', 'TRX / Suspension', 'Battle Ropes', 'Parallettes', 'Gymnastic Rings', 'Power Rack'] },
  { label: 'Cardio', items: ['Treadmill', 'Stationary Bike', 'Rowing Machine', 'Elliptical', 'Stair Climber', 'Jump Rope'] },
  { label: 'Recovery', items: ['Foam Roller'] },
];

const MEDICAL_CATEGORIES = [
  {
    label: 'Upper Body',
    items: [
      { key: 'Shoulder Impingement', desc: 'Limits overhead pressing' },
      { key: 'Rotator Cuff Issue', desc: 'Avoid heavy shoulder loads' },
      { key: 'Wrist Pain', desc: 'Limits barbell grips' },
      { key: 'Elbow Tendinitis', desc: 'Affects curls & pressing' },
    ],
  },
  {
    label: 'Core & Back',
    items: [
      { key: 'Lower Back Issues', desc: 'Limits deadlifts & rows' },
      { key: 'Herniated Disc', desc: 'Avoid spinal loading' },
      { key: 'Hernia', desc: 'Avoid heavy compound lifts' },
    ],
  },
  {
    label: 'Lower Body',
    items: [
      { key: 'Bad Knees', desc: 'Limits squats & leg press' },
      { key: 'Hip Issues', desc: 'Affects hip hinge movements' },
      { key: 'Ankle Instability', desc: 'Affects balance exercises' },
    ],
  },
  {
    label: 'General Health',
    items: [
      { key: 'Post-Surgery', desc: 'Custom low-intensity plan' },
      { key: 'Varicocele', desc: 'Avoid prolonged pressure' },
      { key: 'High Blood Pressure', desc: 'Limits intense cardio' },
      { key: 'Asthma', desc: 'Affects cardio intensity' },
    ],
  },
];

export const DesktopProfile = () => {
  const { uid, profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('equipment');

  // Edit States
  const [editEquipment, setEditEquipment] = useState([]);
  const [editMedicalFlags, setEditMedicalFlags] = useState([]);
  const [editGymName, setEditGymName] = useState('');
  const [editDisableRestTimer, setEditDisableRestTimer] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync state with profile loaded on mount/update
  useEffect(() => {
    if (profile) {
      setEditEquipment(profile.equipmentList || []);
      setEditMedicalFlags(profile.medicalFlags || []);
      setEditGymName(profile.gymName || '');
      setEditDisableRestTimer(profile.disableRestTimer || false);
    }
  }, [profile]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('[Profile] Sign out failed:', err);
    }
  };

  const handleSaveSettings = async () => {
    if (!profile || !uid) return;
    setSaving(true);
    setSuccess(false);
    try {
      const userRef = doc(db, 'users', uid);
      const computedGymId = editGymName.trim()
        ? editGymName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '')
        : '';

      const updates = {
        equipmentList: editEquipment,
        medicalFlags: editMedicalFlags,
        gymName: editGymName.trim(),
        gymId: computedGymId,
        disableRestTimer: editDisableRestTimer,
      };

      await updateDoc(userRef, updates);

      // Trigger store refresh
      useAuthStore.setState({
        profile: {
          ...profile,
          ...updates
        }
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('[Profile] Saving failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const nameInitial = profile?.name ? profile.name.charAt(0).toUpperCase() : 'F';
  const email = profile?.email || auth.currentUser?.email || 'trainer@zenkai.com';

  return (
    <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-8 text-[var(--text-primary)] min-h-[85vh] font-sans select-none">
      
      {/* Header */}
      <div className="border-b-4 border-black pb-5 mt-2 flex justify-between items-end">
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight uppercase leading-none text-white flex items-center gap-3">
            <User className="text-[var(--primary)]" size={32} />
            <span>Profile & Settings</span>
          </h1>
          <p className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider mt-2.5">
            Configure athletic profile parameters, medical flags, and equipment settings
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 border-2 border-black bg-[var(--surface)] hover:bg-[#ef44440c] hover:border-[#ef4444] px-4 py-2 rounded-lg shadow-[3px_3px_0px_black] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] text-xs font-mono font-bold text-[#ef4444] uppercase transition-all"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Setup Configuration (col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* User Profile Summary Card */}
          <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5 w-full">
              {/* Avatar */}
              <div className="w-20 h-20 bg-[var(--primary)] text-black border-4 border-black rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-center font-display font-black text-4xl shrink-0">
                {nameInitial}
              </div>
              
              <div className="flex flex-col min-w-0">
                <h2 className="font-display text-2xl font-black uppercase tracking-wide text-white leading-tight">
                  {profile?.name || 'ZENKAI TRAINER'}
                </h2>
                <span className="text-sm font-mono text-[var(--text-secondary)] mt-0.5 truncate">
                  {email}
                </span>
                
                <div className="flex items-center gap-2 mt-2 font-mono text-xs">
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-xp)] border border-[var(--accent-xp)] bg-[#b5ff2d0c] rounded-md">
                    Level {profile?.level || 1}
                  </span>
                  <span className="text-[var(--secondary)] font-bold">
                    {profile?.levelName || 'Rookie'}
                  </span>
                </div>
              </div>
            </div>

            {/* Streak & XP Badges */}
            <div className="flex md:flex-col gap-3 shrink-0 w-full md:w-auto">
              <div className="flex-1 flex items-center gap-3 border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 rounded-xl shadow-[2px_2px_0px_black] font-mono text-xs">
                <Flame className="text-[var(--primary)] shrink-0" size={16} />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] text-[var(--text-secondary)] uppercase">Streak</span>
                  <span className="font-bold text-white text-sm">{profile?.streak || 0} Days 🔥</span>
                </div>
              </div>
              
              <div className="flex-1 flex items-center gap-3 border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 rounded-xl shadow-[2px_2px_0px_black] font-mono text-xs">
                <Trophy className="text-[var(--accent-xp)] shrink-0" size={16} />
                <div className="flex flex-col text-left">
                  <span className="text-[9px] text-[var(--text-secondary)] uppercase">Total XP</span>
                  <span className="font-bold text-white text-sm">{profile?.xp ?? profile?.totalXP ?? 0} XP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Form Card */}
          <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col gap-6">
            
            {/* Header & Save Action */}
            <div className="border-b border-[var(--border)] pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="font-display font-black text-xl text-white uppercase tracking-tight flex items-center gap-2">
                  <Landmark className="text-[var(--primary)]" size={20} />
                  <span>Athletic Settings Dashboard</span>
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  Map out available equipment setups, app rest defaults, and local gyms.
                </p>
              </div>

              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 bg-[var(--primary)] text-white font-display font-extrabold tracking-wider text-xs uppercase rounded-lg border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <span>{saving ? 'Saving...' : success ? '✓ Saved!' : 'Save Settings'}</span>
              </button>
            </div>

            {/* Top Layout Grid: Gym & Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-sans">
              
              {/* Home Gym */}
              <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-4 rounded-xl shadow-[2px_2px_0px_black] flex flex-col gap-3 text-left">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-display border-b border-[#222] pb-1">
                  Home Gym Tagging
                </span>
                <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                  Connect to Leaderboards by entering your home gym name.
                </p>
                <div className="flex flex-col gap-1 mt-1 font-mono">
                  <label className="text-[9px] text-[var(--secondary)] uppercase tracking-wider font-bold">Gym Name</label>
                  <input
                    type="text"
                    value={editGymName}
                    onChange={(e) => setEditGymName(e.target.value)}
                    placeholder="e.g. Gold's Gym Koramangala"
                    className="w-full bg-black text-white text-xs px-3 py-2 rounded border border-[#222] focus:outline-none focus:border-[var(--primary)] font-sans mt-1"
                  />
                </div>
              </div>

              {/* Preferences */}
              <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-4 rounded-xl shadow-[2px_2px_0px_black] flex flex-col justify-between text-left">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-display border-b border-[#222] pb-1">
                    App Preferences
                  </span>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                    Adjust in-workout telemetry options.
                  </p>
                </div>

                <div className="flex items-center justify-between mt-4">
                  <div className="flex flex-col pr-2">
                    <span className="text-xs font-bold text-white">Disable Rest Timer</span>
                    <span className="text-[9px] text-[var(--text-secondary)] mt-0.5">
                      Disable auto-rest count down.
                    </span>
                  </div>
                  <button
                    onClick={() => setEditDisableRestTimer(p => !p)}
                    className="focus:outline-none text-[var(--primary)] hover:scale-105 active:scale-95 transition-all"
                  >
                    {editDisableRestTimer ? (
                      <ToggleRight size={38} className="text-[var(--primary)]" />
                    ) : (
                      <ToggleLeft size={38} className="text-neutral-600" />
                    )}
                  </button>
                </div>
              </div>

            </div>

            {/* Custom Tab Selector */}
            <div className="flex border-4 border-black bg-black p-1 rounded-xl text-xs font-mono shrink-0">
              <button
                onClick={() => setActiveTab('equipment')}
                className={`flex-1 py-2 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'equipment' ? 'bg-[var(--primary)] text-white shadow-[2px_2px_0px_black]' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Dumbbell size={14} />
                <span>Equipment Setup ({editEquipment.length})</span>
              </button>
              
              <button
                onClick={() => setActiveTab('health')}
                className={`flex-1 py-2 rounded-lg font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'health' ? 'bg-[var(--primary)] text-white shadow-[2px_2px_0px_black]' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <ShieldAlert size={14} />
                <span>Physical Warnings ({editMedicalFlags.length})</span>
              </button>
            </div>

            {/* Tabbed Interactive Lists */}
            <div className="flex-1 max-h-[350px] overflow-y-auto pr-1">
              
              {activeTab === 'equipment' && (
                <div className="flex flex-col gap-4 text-left">
                  
                  {/* Select All */}
                  <div className="flex justify-between items-center bg-black/40 p-2.5 rounded-lg border border-[#222]">
                    <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">Toggle Equipment Checklist</span>
                    <button
                      onClick={() => {
                        const allItems = EQUIPMENT_CATEGORIES.flatMap(cat => cat.items);
                        setEditEquipment(all => all.length === allItems.length ? [] : allItems);
                      }}
                      className="px-3 py-1 text-[10px] font-mono uppercase font-bold border border-[#444] hover:border-[var(--primary)] bg-black text-[var(--text-secondary)] hover:text-white rounded transition-all"
                    >
                      {editEquipment.length === EQUIPMENT_CATEGORIES.flatMap(cat => cat.items).length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {EQUIPMENT_CATEGORIES.map((cat) => (
                    <div key={cat.label} className="border border-[var(--border)] bg-[var(--bg-elevated)] p-3 rounded-xl flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-white uppercase tracking-wider font-display border-b border-[#222] pb-1">
                        {cat.label}
                      </span>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                        {cat.items.map((item) => {
                          const isSelected = editEquipment.includes(item);
                          return (
                            <button
                              key={item}
                              onClick={() => {
                                setEditEquipment(prev =>
                                  prev.includes(item)
                                    ? prev.filter(i => i !== item)
                                    : [...prev, item]
                                );
                              }}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-mono font-bold border text-left flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'bg-[#b5ff2d0e] text-[var(--accent-xp)] border-[var(--accent-xp)]'
                                  : 'bg-black/35 text-[var(--text-secondary)] border-[#222] hover:border-[#444]'
                              }`}
                            >
                              <span className="truncate pr-1">{item}</span>
                              {isSelected && <Check size={10} className="shrink-0 text-[var(--accent-xp)]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                </div>
              )}

              {activeTab === 'health' && (
                <div className="flex flex-col gap-4 text-left">
                  
                  {MEDICAL_CATEGORIES.map((cat) => (
                    <div key={cat.label} className="border border-[var(--border)] bg-[var(--bg-elevated)] p-3 rounded-xl flex flex-col gap-2">
                      <span className="text-[11px] font-bold text-[#ef4444] uppercase tracking-wider font-display border-b border-[#222] pb-1">
                        {cat.label}
                      </span>
                      
                      <div className="flex flex-col gap-2 mt-1">
                        {cat.items.map((flag) => {
                          const isSelected = editMedicalFlags.includes(flag.key);
                          return (
                            <button
                              key={flag.key}
                              onClick={() => {
                                setEditMedicalFlags(prev =>
                                  prev.includes(flag.key)
                                    ? prev.filter(f => f !== flag.key)
                                    : [...prev, flag.key]
                                );
                              }}
                              className={`p-2.5 rounded-lg text-left border flex items-start justify-between gap-3 transition-all ${
                                isSelected
                                  ? 'bg-[#ef44440c] text-[#ef4444] border-[#ef4444]'
                                  : 'bg-black/35 text-[var(--text-secondary)] border-[#222] hover:border-[#444]'
                              }`}
                            >
                              <div className="flex flex-col min-w-0">
                                <span className={`text-[11px] font-bold ${isSelected ? 'text-[#ef4444]' : 'text-white'}`}>
                                  {flag.key}
                                </span>
                                <span className="text-[9px] text-[var(--text-muted)] mt-0.5 leading-tight font-normal font-sans">
                                  {flag.desc}
                                </span>
                              </div>
                              {isSelected && <Check size={12} className="shrink-0 text-[#ef4444] mt-0.5" />}
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  ))}

                </div>
              )}

            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Config & Achievements Panels (col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Academic Exam Buffer Configuration */}
          <AcademicBufferConfig />

          {/* Trophy Cabinet Achievement list */}
          <TrophyCabinetView />

        </div>

      </div>

    </div>
  );
};

export default DesktopProfile;
