import React, { useState, useEffect, useMemo } from 'react';
import { ArrowRight, Activity, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWeeklyRecap } from '../../hooks/useWeeklyRecap';
import { WeeklyRecapScreen } from '../shared/WeeklyRecapScreen';
import { useAuthStore } from '../../stores/useAuthStore';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { calculateMuscleFatigue } from '../../utils/fatigueCalculator';
import { GymLeaderboard } from '../shared/GymLeaderboard';
import { usePRList } from '../../hooks/useProgress';
import { calculateDetailedMuscleStrength } from '../../utils/strengthCalculator';
import { MuscleMap, StrengthRadarChart, StrengthTiersLegend, MuscleDetailPanel } from '../shared/MuscleMap';

export const DesktopDashboard = () => {
  const { uid, profile } = useAuthStore();
  const { prs } = usePRList(uid);
  
  const {
    recap,
    isRecapDay,
    weekId: recapWeekId,
    hasSeen,
    markAsSeen,
  } = useWeeklyRecap();
  
  const [showRecapScreen, setShowRecapScreen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [loadingFatigue, setLoadingFatigue] = useState(true);
  const [fatigueData, setFatigueData] = useState({});
  const [selectedMuscleKey, setSelectedMuscleKey] = useState(null);
  
  const [mannequinView, setMannequinView] = useState('front');
  const [mannequinMode, setMannequinMode] = useState('fatigue');
  const [viewType, setViewType] = useState('grouped');

  const strengthData = useMemo(() => {
    return calculateDetailedMuscleStrength(prs || [], profile || {});
  }, [prs, profile]);

  // Fetch recent sessions on mount to compute fatigue
  useEffect(() => {
    if (!uid) return;
    const fetchRecentSessions = async () => {
      setLoadingFatigue(true);
      try {
        // Query the last 10 session documents
        const sessionsRef = collection(db, 'users', uid, 'sessions');
        const q = query(sessionsRef, orderBy('date', 'desc'), limit(10));
        const snap = await getDocs(q);
        
        const loadedSessions = [];
        for (const docSnap of snap.docs) {
          const sessData = docSnap.data();
          // Fetch nested exercises subcollection
          const exSnap = await getDocs(collection(db, 'users', uid, 'sessions', docSnap.id, 'exercises'));
          const exercises = exSnap.docs.map(exDoc => exDoc.data());
          loadedSessions.push({
            id: docSnap.id,
            ...sessData,
            exercises
          });
        }
        
        setSessions(loadedSessions);
        const fatigue = calculateMuscleFatigue(loadedSessions);
        setFatigueData(fatigue);
      } catch (err) {
        console.error('[DesktopDashboard] Error compiling fatigue data:', err);
      } finally {
        setLoadingFatigue(false);
      }
    };

    fetchRecentSessions();
  }, [uid]);

  // Color mapping helper based on exact fatigue levels
  const getMuscleColor = (muscleKey) => {
    const fatigue = (viewType === 'individual' ? fatigueData.individual?.[muscleKey] : fatigueData.general?.[muscleKey]) || 0;
    if (fatigue > 100) return '#FF3366'; // Neon Red (>100% fatigue)
    if (fatigue >= 30) return '#FFE600'; // Neon Yellow (30-100% fatigue)
    return '#33FF66'; // Neon Green (<30% fatigue)
  };

  const getRecoveryHours = (fatigue) => {
    if (fatigue > 100) return '48 - 72 hours (High Fatigue)';
    if (fatigue >= 30) return '24 - 48 hours (Active Recovery)';
    return 'Fully Recovered (<12 hours)';
  };

  const getMuscleLabel = (key) => {
    const labels = {
      chest: 'Chest',
      back: 'Back',
      shoulders: 'Shoulders',
      arms: 'Arms',
      legs: 'Legs',
      core: 'Core & Abs'
    };
    return labels[key] || key;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8 bg-[var(--bg-oled)] text-[var(--text-primary)] min-h-[85vh] font-sans select-none">
      
      {/* ─── WEEKLY RECAP BANNER ────────────────────────────────────────────── */}
      {isRecapDay && !hasSeen && recap && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-black bg-[var(--surface)] p-5 rounded-xl shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-between cursor-pointer hover:border-[var(--text-primary)] transition-all animate-pulse text-left w-full"
          onClick={() => setShowRecapScreen(true)}
        >
          <div className="flex items-center gap-4">
            <span className="text-3xl">📊</span>
            <div className="flex flex-col">
              <span className="font-display font-extrabold text-base uppercase tracking-wide text-[var(--secondary)]">
                Your weekly recap is ready
              </span>
              <p className="text-xs text-[var(--text-secondary)] font-sans mt-1">
                See your stats, PRs, and download your shareable card!
              </p>
            </div>
          </div>
          <ArrowRight size={20} className="text-[var(--text-secondary)]" />
        </motion.div>
      )}

      {/* Weekly Recap Modal */}
      <WeeklyRecapScreen
        isOpen={showRecapScreen}
        onClose={() => setShowRecapScreen(false)}
        recap={recap}
        weekId={recapWeekId}
        markAsSeen={markAsSeen}
      />

      {/* Dashboard Header */}
      <div className="border-b-4 border-black pb-5 mt-2 flex justify-between items-end">
        <div>
          <h1 className="font-display text-4xl font-black tracking-tight uppercase leading-none text-white flex items-center gap-3">
            <Activity className="text-[var(--primary)]" size={32} />
            <span>TRAINER DASHBOARD</span>
          </h1>
          <p className="text-xs font-mono text-[var(--text-secondary)] uppercase tracking-wider mt-2.5">
            FitDesi Desktop Telemetry Control Center
          </p>
        </div>
        
        {profile?.gymName && (
          <div className="flex items-center gap-2 border-2 border-black bg-[var(--surface)] px-4 py-2 rounded-lg shadow-[3px_3px_0px_black] text-xs font-mono font-bold text-[var(--secondary)] uppercase">
            <Trophy size={14} />
            <span>Home Gym: {profile.gymName}</span>
          </div>
        )}
      </div>

      {/* Main Dual-Panel Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Panel: Muscle Map & Telemetry Control Center (7 columns) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col gap-6">
            <div className="border-b border-[var(--border)] pb-3">
              <h3 className="font-display font-black text-xl text-white uppercase tracking-tight flex items-center gap-2">
                <ShieldAlert className="text-[var(--primary)]" size={20} />
                <span>Mannequin Telemetry Map</span>
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                Interact with the anatomical vectors to analyze overall strength ratios and muscle fatigue parameters.
              </p>
            </div>

            {loadingFatigue ? (
              <div className="flex items-center justify-center h-[340px] text-xs font-mono text-[var(--text-secondary)] uppercase animate-pulse">
                ⚙️ Compiling Telemetry Dashboard...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Mannequin Left */}
                <div className="md:col-span-5 flex justify-center">
                  <MuscleMap
                    fatigueData={fatigueData}
                    strengthData={strengthData}
                    activeMuscle={selectedMuscleKey}
                    onMuscleClick={(m) => setSelectedMuscleKey(selectedMuscleKey === m ? null : m)}
                    mode={mannequinMode}
                    setMode={setMannequinMode}
                    view={mannequinView}
                    setView={setMannequinView}
                    viewType={viewType}
                    setViewType={(vt) => {
                      setViewType(vt);
                      setSelectedMuscleKey(null);
                    }}
                  />
                </div>

                {/* Info Panel Right */}
                <div className="md:col-span-7 flex flex-col gap-4">
                  <MuscleDetailPanel
                    muscleKey={selectedMuscleKey}
                    fatigueScore={
                      mannequinMode === 'fatigue'
                        ? (viewType === 'individual'
                            ? (fatigueData.individual?.[selectedMuscleKey] || 0)
                            : (fatigueData.general?.[selectedMuscleKey] || 0))
                        : 0
                    }
                    strengthScore={
                      viewType === 'individual'
                        ? (strengthData.individual?.[selectedMuscleKey] || 0)
                        : (strengthData.general?.[selectedMuscleKey] || 0)
                    }
                    mode={mannequinMode}
                  />

                  {mannequinMode === 'strength' && (
                    <div className="flex flex-col gap-4">
                      <StrengthRadarChart 
                        strengthData={strengthData}
                        viewType={viewType}
                        title="Universal Strength Split"
                      />
                      <StrengthTiersLegend />
                    </div>
                  )}

                  {mannequinMode === 'fatigue' && (
                    <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-4 rounded-xl shadow-[3px_3px_0px_black] flex flex-col gap-2">
                      <span className="text-[10px] font-mono text-[var(--secondary)] uppercase tracking-wider font-bold">
                        Fatigue Index (ACWR)
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mt-1">
                        Acute-to-Chronic Workload Ratio calculated from working sets. Green indicates recovered, yellow is active recovery, and red represents high fatigue.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Gym Leaderboard (5 columns) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <GymLeaderboard gymId={profile?.gymId} gymName={profile?.gymName} />
        </div>
        
      </div>
    </div>
  );
};
