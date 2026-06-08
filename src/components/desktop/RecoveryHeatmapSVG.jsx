import React, { useState } from 'react';
import { Activity, ShieldAlert, Sparkles, RefreshCcw } from 'lucide-react';

export const RecoveryHeatmapSVG = ({ fatigueData = {}, onSelectMuscle }) => {
  const [view, setView] = useState('front'); // 'front' | 'back'
  const [selectedMuscle, setSelectedMuscle] = useState(null);

  const muscleSoreness = fatigueData?.general ?? {
    chest: 20,
    back: 80,
    shoulders: 45,
    arms: 10,
    legs: 110,
    core: 5
  };

  const getFatigueColor = (muscleKey) => {
    const fatigue = muscleSoreness[muscleKey] ?? 0;
    if (fatigue > 100) return '#FF3366'; // Neon Red / Heavy Fatigue
    if (fatigue >= 30) return '#FFE600'; // Neon Yellow / Intermediate Fatigue
    return '#33FF66'; // Neon Green / Recovered
  };

  const handleMuscleClick = (key) => {
    const next = selectedMuscle === key ? null : key;
    setSelectedMuscle(next);
    if (onSelectMuscle) onSelectMuscle(next);
  };

  return (
    <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-3 flex justify-between items-center">
        <div>
          <h3 className="font-display font-black text-xl text-white uppercase tracking-tight flex items-center gap-2">
            <Activity className="text-[var(--primary)]" size={20} />
            <span>SVG Anatomy Recovery Map</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Anatomical telemetry mapping showing cumulative muscle workload fatigue.
          </p>
        </div>
        
        {/* Toggle View */}
        <button
          onClick={() => setView(v => v === 'front' ? 'back' : 'front')}
          className="flex items-center gap-1.5 bg-[#111] border border-black hover:border-[var(--primary)] px-3 py-1.5 rounded-lg text-xs text-white transition-all font-mono font-bold uppercase"
        >
          <RefreshCcw size={12} />
          <span>{view} view</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* SVG Silhouette Container */}
        <div className="md:col-span-5 flex justify-center bg-black/60 p-4 rounded-xl border border-[#222]">
          <svg
            viewBox="0 0 100 220"
            className="w-full max-w-[150px] h-auto drop-shadow-[0_0_10px_rgba(0,0,0,0.5)] select-none"
          >
            {/* Outline Silhouette of Head */}
            <circle cx="50" cy="20" r="12" fill="#222" stroke="#444" strokeWidth="1.5" />
            
            {/* Outline Silhouette of Neck */}
            <rect x="47" y="32" width="6" height="8" fill="#222" stroke="#444" strokeWidth="1.5" />

            {/* Front View Muscles */}
            {view === 'front' ? (
              <>
                {/* Chest */}
                <path
                  d="M32 42 h36 v22 h-36 z"
                  fill={getFatigueColor('chest')}
                  stroke="#000"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => handleMuscleClick('chest')}
                />
                <text x="50" y="55" textAnchor="middle" fill="#000" fontSize="6" fontWeight="bold" className="pointer-events-none font-mono">CHEST</text>

                {/* Shoulders */}
                <path
                  d="M20 42 h10 v18 h-10 z M70 42 h10 v18 h-10 z"
                  fill={getFatigueColor('shoulders')}
                  stroke="#000"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => handleMuscleClick('shoulders')}
                />

                {/* Arms */}
                <path
                  d="M15 62 h12 v48 h-12 z M73 62 h12 v48 h-12 z"
                  fill={getFatigueColor('arms')}
                  stroke="#000"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => handleMuscleClick('arms')}
                />

                {/* Core */}
                <path
                  d="M34 66 h32 v42 h-32 z"
                  fill={getFatigueColor('core')}
                  stroke="#000"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => handleMuscleClick('core')}
                />
                <text x="50" y="88" textAnchor="middle" fill="#000" fontSize="6" fontWeight="bold" className="pointer-events-none font-mono">ABS</text>

                {/* Legs */}
                <path
                  d="M28 112 h20 v90 h-20 z M52 112 h20 v90 h-20 z"
                  fill={getFatigueColor('legs')}
                  stroke="#000"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => handleMuscleClick('legs')}
                />
                <text x="38" y="160" textAnchor="middle" fill="#000" fontSize="6" fontWeight="bold" className="pointer-events-none font-mono">LEGS</text>
                <text x="62" y="160" textAnchor="middle" fill="#000" fontSize="6" fontWeight="bold" className="pointer-events-none font-mono">LEGS</text>
              </>
            ) : (
              <>
                {/* Back Upper */}
                <path
                  d="M30 42 h40 v32 h-40 z"
                  fill={getFatigueColor('back')}
                  stroke="#000"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => handleMuscleClick('back')}
                />
                <text x="50" y="60" textAnchor="middle" fill="#000" fontSize="7" fontWeight="bold" className="pointer-events-none font-mono">BACK</text>

                {/* Back Lower */}
                <path
                  d="M34 76 h32 v32 h-32 z"
                  fill={getFatigueColor('back')}
                  stroke="#000"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => handleMuscleClick('back')}
                />

                {/* Shoulders Back */}
                <path
                  d="M20 42 h10 v18 h-10 z M70 42 h10 v18 h-10 z"
                  fill={getFatigueColor('shoulders')}
                  stroke="#000"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => handleMuscleClick('shoulders')}
                />

                {/* Legs Back */}
                <path
                  d="M28 110 h20 v92 h-20 z M52 110 h20 v92 h-20 z"
                  fill={getFatigueColor('legs')}
                  stroke="#000"
                  strokeWidth="1.5"
                  className="cursor-pointer hover:brightness-110 transition-all"
                  onClick={() => handleMuscleClick('legs')}
                />
                <text x="38" y="160" textAnchor="middle" fill="#000" fontSize="6" fontWeight="bold" className="pointer-events-none font-mono">GLUTES</text>
                <text x="62" y="160" textAnchor="middle" fill="#000" fontSize="6" fontWeight="bold" className="pointer-events-none font-mono">GLUTES</text>
              </>
            )}
          </svg>
        </div>

        {/* Sidebar details */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {selectedMuscle ? (
            <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-4 rounded-xl shadow-[3px_3px_0px_black] flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-2 font-mono text-xs uppercase font-bold">
                <span className="text-white">{selectedMuscle} telemetry</span>
                <span className={`text-[10px] ${
                  (muscleSoreness[selectedMuscle] ?? 0) > 100 ? 'text-[#FF3366]' :
                  (muscleSoreness[selectedMuscle] ?? 0) >= 30 ? 'text-[#FFE600]' : 'text-[#33FF66]'
                }`}>
                  {muscleSoreness[selectedMuscle] ?? 0}% strain
                </span>
              </div>

              <div className="flex flex-col gap-1 text-xs">
                <span className="font-mono text-[var(--text-secondary)] text-[10px] uppercase font-bold">Readiness</span>
                <p className="text-white">
                  {(muscleSoreness[selectedMuscle] ?? 0) > 100 ? '🔴 High systemic fatigue. Do not perform heavy work.' :
                   (muscleSoreness[selectedMuscle] ?? 0) >= 30 ? '🟡 Light fatigue. Target active restoration/stretching.' :
                   '🟢 Full cellular recovery. Ready for high intensity.'}
                </p>
              </div>

              <div className="flex flex-col gap-1 text-xs mt-2 border-t border-[var(--border)] pt-2">
                <span className="font-mono text-[var(--text-secondary)] text-[10px] uppercase font-bold">Plateau Spares & Alternates</span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                  {selectedMuscle === 'chest' && 'Swap Barbell Bench for Leg Extensions or Cable Flyes to prevent triceps/delts overload.'}
                  {selectedMuscle === 'legs' && 'Perform Leg Press or Hamstring Curls. Avoid heavy squats to protect lower back load.'}
                  {selectedMuscle === 'shoulders' && 'Avoid Overhead Presses. Perform dumbbell lateral raises or face pulls to keep stress low.'}
                  {!['chest', 'legs', 'shoulders'].includes(selectedMuscle) && 'Routine holds alternative movements for active deloading.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-4 rounded-xl shadow-[3px_3px_0px_black] text-center font-mono text-xs text-[var(--text-secondary)] py-12">
              Select a muscle on the mannequin to view structural logs and biomechanical alternates.
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
