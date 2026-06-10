import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useXPStore } from '../../stores/useXPStore';
import { useUIStore } from '../../stores/useUIStore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Smartphone, LogOut, Info, User, Flame, Trophy, Award, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeeklyRecap } from '../../hooks/useWeeklyRecap';
import { WeeklyRecapScreen } from '../shared/WeeklyRecapScreen';
import { GymLeaderboard } from '../shared/GymLeaderboard';

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

export const MobileProfile = () => {
  const { profile } = useAuthStore();
  const { totalXP, level, levelName, streak } = useXPStore();
  const { isStandalone, openModal, addToast } = useUIStore();

  const { recap, weekId: recapWeekId } = useWeeklyRecap();
  const [showRecap, setShowRecap] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('equipment');
  const [editEquipment, setEditEquipment] = useState([]);
  const [editMedicalFlags, setEditMedicalFlags] = useState([]);
  const [editGymName, setEditGymName] = useState('');
  const [editDisableRestTimer, setEditDisableRestTimer] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      addToast('Successfully signed out!', 'info');
    } catch (err) {
      console.error('Error logging out:', err);
      addToast('Failed to sign out. Try again.', 'error');
    }
  };

  const handleSaveSettings = async () => {
    if (!profile || !auth.currentUser) return;
    setIsSavingSettings(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const computedGymId = editGymName.trim()
        ? editGymName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '')
        : '';
      
      const oldGymId = profile.gymId || '';
      let lookingForSquad = profile.lookingForSquad;
      if (!computedGymId) {
        lookingForSquad = false;
      } else if (computedGymId !== oldGymId || lookingForSquad === undefined) {
        lookingForSquad = true;
      }

      const updates = {
        equipmentList: editEquipment,
        medicalFlags: editMedicalFlags,
        gymName: editGymName.trim(),
        gymId: computedGymId,
        disableRestTimer: editDisableRestTimer,
        lookingForSquad,
      };

      await updateDoc(userRef, updates);

      // Update local profile state
      useAuthStore.setState({
        profile: {
          ...profile,
          ...updates
        }
      });

      // Sync public squad_codes document
      if (profile.squadCode) {
        const codeRef = doc(db, 'squad_codes', profile.squadCode);
        await updateDoc(codeRef, {
          gymId: computedGymId,
          gymName: editGymName.trim(),
          lookingForSquad
        }).catch(err => console.warn('[MobileProfile] Failed to update squad code doc:', err));
      }

      addToast('Profile updated successfully!', 'success');
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Error saving settings:', err);
      addToast('Failed to save settings. Try again.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const nameInitial = profile?.name ? profile.name.charAt(0).toUpperCase() : 'F';
  const email = profile?.email || auth.currentUser?.email || 'trainer@zenkai.com';

  return (
    <div className="flex flex-col gap-6 p-4 min-h-[100dvh] bg-[var(--bg-base)] text-[var(--text-primary)] pb-28">
      {/* ─── TITLE HEADER ────────────────────────────────────────────────── */}
      <div className="border-b-2 border-[var(--border)] pb-4 mt-2">
        <h1 className="font-display text-3xl font-extrabold tracking-tight uppercase leading-none text-white">
          Trainer Profile
        </h1>
        <p className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider mt-1">
          Your Strength Telemetry
        </p>
      </div>

      {/* ─── USER CARD ───────────────────────────────────────────────────── */}
      <div className="border-2 border-black bg-[var(--surface)] p-5 rounded-lg shadow-[5px_5px_0px_rgba(0,0,0,1)] flex items-center gap-4">
        {/* Neubrutalist Avatar */}
        <div className="w-16 h-16 bg-[var(--primary)] text-black border-2 border-black rounded shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-center font-display font-black text-3xl shrink-0">
          {nameInitial}
        </div>
        
        <div className="flex flex-col min-w-0">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide truncate text-[var(--text-primary)]">
            {profile?.name || 'ZENKAI TRAINER'}
          </h2>
          <span className="text-xs text-[var(--text-secondary)] font-mono truncate">
            {email}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider text-[var(--accent-xp)] border border-[var(--accent-xp)] bg-[#b5ff2d0e] rounded">
              Lvl {level}
            </span>
            <span className="text-[10px] font-sans font-semibold text-[var(--secondary)]">
              {levelName}
            </span>
          </div>
        </div>
      </div>

      {/* ─── QUICK METRICS GRID ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border-2 border-[var(--border-bright)] bg-[var(--surface)] p-3 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col gap-1">
          <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
            <Flame size={12} className="text-[var(--primary)]" />
            STREAK
          </span>
          <span className="font-mono text-xl font-bold text-white">
            {streak} <span className="text-xs text-[var(--text-secondary)] font-sans">days</span>
          </span>
        </div>
        <div className="border-2 border-[var(--border-bright)] bg-[var(--surface)] p-3 rounded-lg shadow-[3px_3px_0px_rgba(0,0,0,1)] flex flex-col gap-1">
          <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
            <Trophy size={12} className="text-[var(--accent-xp)]" />
            TOTAL XP
          </span>
          <span className="font-mono text-xl font-bold text-white">
            {totalXP} <span className="text-xs text-[var(--text-secondary)] font-sans">XP</span>
          </span>
        </div>
      </div>

      {/* ─── SETTINGS ACTIONS ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 mt-2">
        <h3 className="font-display text-lg font-bold uppercase tracking-wide text-[var(--text-primary)]">
          Application Settings
        </h3>

        {/* Install on Device (Only visible if not standalone) */}
        {!isStandalone && (
          <motion.button
            onClick={() => openModal('pwaInstall')}
            className="w-full p-4 border-2 border-black bg-[var(--surface)] hover:bg-[#1a1a1a] text-left rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-between"
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-[#00d4ff0e] border border-[var(--secondary)] text-[var(--secondary)]">
                <Smartphone size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
                  Install on Device
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                  Launch from home screen as native app
                </span>
              </div>
            </div>
            <Smartphone size={16} className="text-[var(--text-muted)]" />
          </motion.button>
        )}

        {/* Edit Equipment & Health Button */}
        <motion.button
          onClick={() => {
            setEditEquipment(profile?.equipmentList || []);
            setEditMedicalFlags(profile?.medicalFlags || []);
            setEditGymName(profile?.gymName || '');
            setEditDisableRestTimer(profile?.disableRestTimer || false);
            setIsEditModalOpen(true);
            setActiveSettingsTab('equipment');
          }}
          className="w-full p-4 border-2 border-black bg-[var(--surface)] hover:bg-[#1a1a1a] text-left rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-between"
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#a78bfa0e] border border-[#a78bfa] text-[#a78bfa]">
              <User size={18} />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
                Edit Equipment & Health
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                Update available equipment and health flags
              </span>
            </div>
          </div>
          <User size={16} className="text-[var(--text-muted)]" />
        </motion.button>

        {/* Weekly Recap Button */}
        {recap && (
          <motion.button
            onClick={() => setShowRecap(true)}
            className="w-full p-4 border-2 border-black bg-[var(--surface)] hover:bg-[#1a1a1a] text-left rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-between"
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-[#b5ff2d0e] border border-[var(--accent-xp)] text-[var(--accent-xp)]">
                <Award size={18} />
              </div>
              <div className="flex flex-col">
                <span className="font-display text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
                  Weekly Recap
                </span>
                <span className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                  View your training summary and shareable card
                </span>
              </div>
            </div>
            <Award size={16} className="text-[var(--text-muted)]" />
          </motion.button>
        )}

        {/* Sign Out Button */}
        <motion.button
          onClick={handleLogout}
          className="w-full p-4 border-2 border-black bg-[var(--surface)] hover:bg-[#1a1a1a] text-left rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:scale-[0.99] transition-all flex items-center justify-between"
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-[#ef44440e] border border-[#ef4444] text-[#ef4444]">
              <LogOut size={18} />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-sm font-bold uppercase tracking-wide text-[var(--text-primary)]">
                Sign Out
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                Log out of your Zenkai session
              </span>
            </div>
          </div>
          <LogOut size={16} className="text-[var(--text-muted)]" />
        </motion.button>
      </div>

      {/* ─── LOCAL GYM LEADERBOARD ───────────────────────────────────────── */}
      {profile?.gymId ? (
        <div className="mt-4">
          <GymLeaderboard gymId={profile.gymId} gymName={profile.gymName} />
        </div>
      ) : (
        <div className="border-2 border-black border-dashed bg-[var(--surface)] p-5 rounded-lg flex flex-col items-center text-center gap-3 mt-4 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
          <Trophy className="w-10 h-10 text-[var(--text-muted)] stroke-[1.5]" />
          <h4 className="font-display text-base font-bold uppercase text-white tracking-wide">
            Local Leaderboard Locked
          </h4>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs">
            Tag your home gym in your profile settings to unlock local lifter leaderboard competitions!
          </p>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setEditEquipment(profile?.equipmentList || []);
              setEditMedicalFlags(profile?.medicalFlags || []);
              setEditGymName(profile?.gymName || '');
              setEditDisableRestTimer(profile?.disableRestTimer || false);
              setIsEditModalOpen(true);
              setActiveSettingsTab('gym');
            }}
            className="px-4 py-2 border-2 border-black bg-[var(--secondary)] text-black font-display font-extrabold text-xs uppercase tracking-wider rounded shadow-[3px_3px_0px_rgba(0,0,0,1)] active:scale-95 transition-all cursor-pointer"
          >
            Tag Home Gym Now
          </motion.button>
        </div>
      )}

      {/* Weekly Recap Modal */}
      {recap && (
        <WeeklyRecapScreen
          isOpen={showRecap}
          onClose={() => setShowRecap(false)}
          recap={recap}
          weekId={recapWeekId}
          markAsSeen={() => {}}
        />
      )}

      {/* ─── EDIT EQUIPMENT & HEALTH MODAL ────────────────────────────── */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-xs">
            {/* Backdrop Close */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsEditModalOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="bg-[#111111] border-2 border-black rounded-lg p-5 w-full max-w-md max-h-[85vh] overflow-hidden shadow-[8px_8px_0px_rgba(0,0,0,1)] relative flex flex-col gap-4 text-white z-10"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="absolute top-4 right-4 text-xs text-[var(--text-secondary)] hover:text-white transition-all bg-transparent border-none cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 border-b-2 border-[#222222] pb-3">
                <div className="p-2 rounded bg-[#a78bfa0e] border border-[#a78bfa] text-[#a78bfa] shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  <User size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-extrabold text-lg uppercase tracking-wide leading-none">
                    Edit Setup
                  </span>
                  <span className="text-[10px] font-mono text-[var(--secondary)] uppercase tracking-wider mt-1">
                    Equipment & Restrictions
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-2 border-black rounded overflow-hidden shrink-0">
                <button
                  onClick={() => setActiveSettingsTab('equipment')}
                  className={`flex-1 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
                    activeSettingsTab === 'equipment'
                      ? 'bg-[var(--primary)] text-black font-black'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  Equipment
                </button>
                <button
                  onClick={() => setActiveSettingsTab('health')}
                  className={`flex-1 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
                    activeSettingsTab === 'health'
                      ? 'bg-[#ef4444] text-black font-black'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  Health
                </button>
                <button
                  onClick={() => setActiveSettingsTab('gym')}
                  className={`flex-1 py-2 font-display text-xs font-bold uppercase tracking-wider transition-all ${
                    activeSettingsTab === 'gym'
                      ? 'bg-[var(--secondary)] text-black font-black'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)]'
                  }`}
                >
                  Gym & App
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 font-sans text-sm scrollbar-none my-2">
                {activeSettingsTab === 'gym' ? (
                  <div className="flex flex-col gap-4">
                    {/* Home Gym Tagging */}
                    <div className="border-2 border-black bg-[#161616] p-4 rounded flex flex-col gap-3 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-display border-b border-[#222] pb-1">
                        Home Gym Tagging
                      </span>
                      <p className="text-[10px] text-[var(--text-secondary)] font-sans leading-relaxed">
                        Tag your local branch to unlock localized leaderboard competitions with other local lifters.
                      </p>
                      <div className="flex flex-col gap-1 mt-2">
                        <label className="text-[10px] font-mono text-[var(--secondary)] uppercase tracking-wider">
                          Gym Name
                        </label>
                        <input
                          type="text"
                          value={editGymName}
                          onChange={(e) => setEditGymName(e.target.value)}
                          placeholder="e.g. Gold's Gym Koramangala"
                          className="w-full bg-[#1a1a1a] text-white text-xs p-3 rounded border border-[#2c2c2c] focus:outline-none focus:border-[var(--primary)] font-sans mt-1"
                        />
                      </div>
                      {editGymName.trim() && (
                        <div className="mt-1 bg-black/40 border border-[#222] p-2.5 rounded text-[10px] font-mono text-[var(--text-secondary)]">
                          COMPUTED ID: <span className="text-[var(--primary)] font-bold">{editGymName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_+|_+$)/g, '')}</span>
                        </div>
                      )}
                    </div>

                    {/* App Preferences */}
                    <div className="border-2 border-black bg-[#161616] p-4 rounded flex flex-col gap-3 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                      <span className="text-xs font-bold text-white uppercase tracking-wider font-display border-b border-[#222] pb-1">
                        App Preferences
                      </span>
                      <p className="text-[10px] text-[var(--text-secondary)] font-sans leading-relaxed">
                        Customize your workout logger experience.
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditDisableRestTimer(prev => !prev)}
                        className="flex items-center justify-between text-left mt-2 min-h-[44px] w-full focus:outline-none"
                      >
                        <div className="flex flex-col pr-2">
                          <span className="text-xs font-bold text-white">Disable Rest Timer</span>
                          <span className="text-[9px] text-[var(--text-secondary)] mt-0.5">
                            Do not start a countdown when marking a set as done.
                          </span>
                        </div>
                        <div
                          className={`w-11 h-6 rounded-full p-1 transition-colors duration-200 border border-[var(--border-bright)] shrink-0 ${
                            editDisableRestTimer ? 'bg-[var(--secondary)] text-black' : 'bg-[#1a1a1a]'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                              editDisableRestTimer ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </div>
                      </button>
                    </div>
                  </div>
                ) : activeSettingsTab === 'equipment' ? (
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center bg-[#1a1a1a] p-2.5 rounded border border-[#222222]">
                      <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">Quick Actions</span>
                      <button
                        onClick={() => {
                          const allItems = EQUIPMENT_CATEGORIES.flatMap(cat => cat.items);
                          setEditEquipment(all => all.length === allItems.length ? [] : allItems);
                        }}
                        className="px-3 py-1 text-[10px] font-display uppercase font-bold border-2 border-black bg-[var(--secondary)] text-black rounded shadow-[2px_2px_0px_rgba(0,0,0,1)] active:scale-95 transition-all"
                      >
                        {editEquipment.length === EQUIPMENT_CATEGORIES.flatMap(cat => cat.items).length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    
                    {EQUIPMENT_CATEGORIES.map((cat) => (
                      <div key={cat.label} className="border-2 border-black bg-[#161616] p-3 rounded flex flex-col gap-2 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                        <span className="text-[11px] font-bold text-white uppercase tracking-wider font-display border-b border-[#222] pb-1">
                          {cat.label}
                        </span>
                        <div className="grid grid-cols-2 gap-2 mt-1">
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
                                className={`px-2 py-1.5 rounded text-[10px] font-sans font-bold border text-left flex items-center justify-between transition-all ${
                                  isSelected
                                    ? 'bg-[#b5ff2d1c] text-[var(--accent-xp)] border-[var(--accent-xp)]'
                                    : 'bg-[#1a1a1a] text-[var(--text-secondary)] border-[#2c2c2c] hover:border-[#444]'
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
                ) : (
                  <div className="flex flex-col gap-4">
                    {MEDICAL_CATEGORIES.map((cat) => (
                      <div key={cat.label} className="border-2 border-black bg-[#161616] p-3 rounded flex flex-col gap-2 shadow-[2px_2px_0px_rgba(0,0,0,0.5)]">
                        <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider font-display border-b border-[#222] pb-1">
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
                                className={`p-2 rounded text-left border flex items-start justify-between gap-3 transition-all ${
                                  isSelected
                                    ? 'bg-[#ef444413] text-red-400 border-red-500'
                                    : 'bg-[#1a1a1a] text-[var(--text-secondary)] border-[#2c2c2c] hover:border-[#444]'
                                }`}
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-[11px] font-bold ${isSelected ? 'text-red-400' : 'text-white'}`}>
                                    {flag.key}
                                  </span>
                                  <span className="text-[9px] text-[var(--text-muted)] mt-0.5 leading-tight font-normal">
                                    {flag.desc}
                                  </span>
                                </div>
                                {isSelected && <Check size={12} className="shrink-0 text-red-500 mt-0.5" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-3 mt-1 pt-3 border-t border-[#222] shrink-0">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-2.5 bg-transparent text-[var(--text-secondary)] hover:text-white border-2 border-[#222222] rounded text-xs font-mono font-bold tracking-wider hover:border-[#333333] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="flex-1 py-2.5 bg-[var(--primary)] text-black font-display font-extrabold tracking-widest text-xs uppercase rounded border-2 border-black shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSavingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── SYSTEM INFO ─────────────────────────────────────────────────── */}
      <div className="border-2 border-[var(--border)] bg-[var(--bg-elevated)] p-4 rounded-lg flex items-start gap-3 mt-auto">
        <Info size={18} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
        <div className="flex flex-col">
          <span className="font-display text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]">
            Zenkai Mobile v1.0.0
          </span>
          <p className="text-[9px] text-[var(--text-secondary)] font-sans leading-relaxed mt-0.5">
            Designed for Indian athletes. Standard Neubrutalist Telemetry Shell. Offline synchronization enabled via local caching.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileProfile;
