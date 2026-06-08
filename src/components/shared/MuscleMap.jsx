import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldAlert, Trophy, Shield, Crown, Diamond, ChevronUp, Circle, 
  Clock, TrendingUp, Calendar, Zap, AlertCircle, Compass 
} from 'lucide-react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip 
} from 'recharts';

import { FrontBodyOverlay, BackBodyOverlay } from './MuscleOverlay';
import { getStrengthTier } from '../../utils/strengthCalculator';

// HUD Target Coordinates for angled leader lines (viewBox 0 0 240 420)
// Adjusted for A-pose coordinates
const LEADER_LINES = {
  front: {
    chest: { from: { x: 103, y: 106 }, to: { x: 45, y: 88 }, align: 'left', label: 'PECTORALS', sub: 'Pectoralis Major' },
    shoulders: { from: { x: 73, y: 107 }, to: { x: 35, y: 92 }, align: 'left', label: 'DELTOIDS', sub: 'Shoulder Group' },
    biceps: { from: { x: 64, y: 132 }, to: { x: 25, y: 130 }, align: 'left', label: 'BICEPS', sub: 'Upper Arm Pull' },
    forearms: { from: { x: 38, y: 162 }, to: { x: 15, y: 175 }, align: 'left', label: 'FOREARMS', sub: 'Lower Arm Grip' },
    abs: { from: { x: 120, y: 150 }, to: { x: 45, y: 155 }, align: 'left', label: 'ABDOMINALS', sub: 'Rectus Abdominis' },
    obliques: { from: { x: 95, y: 150 }, to: { x: 45, y: 155 }, align: 'left', label: 'OBLIQUES', sub: 'Core Rotators' },
    quads: { from: { x: 102, y: 225 }, to: { x: 30, y: 260 }, align: 'left', label: 'QUADRICEPS', sub: 'Thigh Front' },
    calves: { from: { x: 98, y: 330 }, to: { x: 30, y: 340 }, align: 'left', label: 'CALVES', sub: 'Lower Leg' },
    
    // Group keys fallbacks
    arms: { from: { x: 64, y: 132 }, to: { x: 25, y: 130 }, align: 'left', label: 'ARMS', sub: 'Biceps & Forearms' },
    core: { from: { x: 120, y: 150 }, to: { x: 45, y: 155 }, align: 'left', label: 'CORE', sub: 'Abs & Obliques' },
    legs: { from: { x: 102, y: 225 }, to: { x: 30, y: 260 }, align: 'left', label: 'LEGS', sub: 'Quads & Calves' }
  },
  back: {
    traps: { from: { x: 120, y: 102 }, to: { x: 45, y: 72 }, align: 'left', label: 'TRAPEZIUS', sub: 'Upper Back' },
    lats: { from: { x: 100, y: 140 }, to: { x: 45, y: 110 }, align: 'left', label: 'LATISSIMUS', sub: 'Lat Wing Outer' },
    lower_back: { from: { x: 120, y: 190 }, to: { x: 45, y: 180 }, align: 'left', label: 'LOWER BACK', sub: 'Erector Spinae' },
    shoulders: { from: { x: 73, y: 107 }, to: { x: 35, y: 92 }, align: 'left', label: 'REAR DELTOIDS', sub: 'Shoulders Back' },
    triceps: { from: { x: 65, y: 130 }, to: { x: 25, y: 130 }, align: 'left', label: 'TRICEPS', sub: 'Upper Arm Push' },
    glutes: { from: { x: 103, y: 235 }, to: { x: 35, y: 240 }, align: 'left', label: 'GLUTEALS', sub: 'Hip Extension' },
    hamstrings: { from: { x: 105, y: 290 }, to: { x: 35, y: 300 }, align: 'left', label: 'HAMSTRINGS', sub: 'Thigh Back' },
    calves: { from: { x: 103, y: 360 }, to: { x: 35, y: 350 }, align: 'left', label: 'CALVES', sub: 'Gastrocnemius' },
    
    // Group keys fallbacks
    back: { from: { x: 100, y: 140 }, to: { x: 45, y: 110 }, align: 'left', label: 'BACK', sub: 'Traps & Lats' },
    arms: { from: { x: 65, y: 130 }, to: { x: 25, y: 130 }, align: 'left', label: 'ARMS', sub: 'Triceps' },
    legs: { from: { x: 105, y: 290 }, to: { x: 35, y: 300 }, align: 'left', label: 'LEGS', sub: 'Hamstrings & Glutes' }
  }
};

/**
 * FrontBackToggle: Pill toggle with Framer Motion layout animation.
 */
export const FrontBackToggle = ({ view, onChange }) => {
  return (
    <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border)] relative select-none w-48">
      {['front', 'back'].map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`flex-1 py-1.5 text-xs font-display uppercase font-bold tracking-wider relative z-10 transition-colors duration-200 ${
            view === item ? 'text-black font-extrabold' : 'text-[var(--text-secondary)]'
          }`}
        >
          {view === item && (
            <motion.div
              layoutId="viewToggleIndicator"
              className="absolute inset-0 bg-[var(--primary)] rounded-md -z-10"
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            />
          )}
          {item}
        </button>
      ))}
    </div>
  );
};

/**
 * ModeToggle: Toggle between Fatigue Telemetry and Strength Tiers.
 */
export const ModeToggle = ({ mode, onChange }) => {
  return (
    <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border)] relative select-none w-64">
      {[
        { id: 'fatigue', label: 'Fatigue (ACWR)' },
        { id: 'strength', label: 'Strength Ranks' }
      ].map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`flex-1 py-1.5 text-[10px] font-display uppercase font-bold tracking-wider relative z-10 transition-colors duration-200 ${
            mode === item.id ? 'text-black font-extrabold' : 'text-[var(--text-secondary)]'
          }`}
        >
          {mode === item.id && (
            <motion.div
              layoutId="modeToggleIndicator"
              className="absolute inset-0 bg-[var(--secondary)] rounded-md -z-10"
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            />
          )}
          {item.label}
        </button>
      ))}
    </div>
  );
};

/**
 * ViewTypeToggle: Toggle between Grouped and Individual Muscle stats views.
 */
export const ViewTypeToggle = ({ viewType, onChange }) => {
  return (
    <div className="flex bg-[var(--bg-elevated)] p-1 rounded-lg border border-[var(--border)] relative select-none w-56">
      {['grouped', 'individual'].map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={`flex-1 py-1.5 text-[10px] font-display uppercase font-bold tracking-wider relative z-10 transition-colors duration-200 ${
            viewType === item ? 'text-black font-extrabold' : 'text-[var(--text-secondary)]'
          }`}
        >
          {viewType === item && (
            <motion.div
              layoutId="viewTypeToggleIndicator"
              className="absolute inset-0 bg-[var(--primary)] rounded-md -z-10"
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            />
          )}
          {item === 'grouped' ? 'Grouped View' : 'Individual View'}
        </button>
      ))}
    </div>
  );
};

/**
 * StrengthTiersLegend: Displays the standard legend scale.
 */
export const StrengthTiersLegend = () => {
  const tiers = [
    { label: 'LEGENDARY', score: '90-100', color: '#FFD700', Icon: Crown },
    { label: 'EPIC',      score: '75-89',  color: '#B44FE8', Icon: Diamond },
    { label: 'ADVANCED',  score: '60-74',  color: '#4F8EF7', Icon: Shield },
    { label: 'INTERMEDIATE', score: '40-59', color: '#22C55E', Icon: ChevronUp },
    { label: 'BEGINNER',   score: '0-39',   color: '#888888', Icon: Circle }
  ];

  return (
    <div className="flex flex-col gap-2 p-4 border border-[var(--border)] bg-[var(--surface)] rounded-xl shadow-[3px_3px_0px_black] w-full max-w-xs">
      <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider font-bold">
        Strength Classifications
      </span>
      <div className="flex flex-col gap-2.5 mt-2">
        {tiers.map(({ label, score, color, Icon }) => (
          <div key={label} className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <Icon size={14} style={{ color }} />
              <span className="font-display font-extrabold uppercase tracking-wide" style={{ color }}>
                {label}
              </span>
            </div>
            <span className="font-mono text-[var(--text-secondary)]">{score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * StrengthRadarChart: Renders the Recharts polar radar representing overall strength.
 */
export const StrengthRadarChart = ({ strengthData = {}, viewType = 'grouped', title = "Overall Strength Split" }) => {
  const generalScores = strengthData.general || {};
  const individualScores = strengthData.individual || {};

  const data = useMemo(() => {
    if (viewType === 'individual') {
      return [
        { subject: 'Chest', A: individualScores.chest || 30 },
        { subject: 'Traps', A: individualScores.traps || 30 },
        { subject: 'Lats', A: individualScores.lats || 30 },
        { subject: 'L.Back', A: individualScores.lower_back || 30 },
        { subject: 'Delts', A: individualScores.shoulders || 30 },
        { subject: 'Biceps', A: individualScores.biceps || 30 },
        { subject: 'Triceps', A: individualScores.triceps || 30 },
        { subject: 'Forearms', A: individualScores.forearms || 30 },
        { subject: 'Abs', A: individualScores.abs || 30 },
        { subject: 'Obliques', A: individualScores.obliques || 30 },
        { subject: 'Quads', A: individualScores.quads || 30 },
        { subject: 'Hams', A: individualScores.hamstrings || 30 },
        { subject: 'Glutes', A: individualScores.glutes || 30 },
        { subject: 'Calves', A: individualScores.calves || 30 }
      ];
    } else {
      return [
        { subject: 'Chest', A: generalScores.chest || 30 },
        { subject: 'Back', A: generalScores.back || 30 },
        { subject: 'Arms', A: generalScores.arms || 30 },
        { subject: 'Shoulders', A: generalScores.shoulders || 30 },
        { subject: 'Legs', A: generalScores.legs || 30 },
        { subject: 'Core', A: generalScores.core || 30 }
      ];
    }
  }, [generalScores, individualScores, viewType]);

  // Overall Score average
  const overallScore = useMemo(() => {
    const scores = viewType === 'individual' ? individualScores : generalScores;
    const vals = Object.values(scores);
    if (vals.length === 0) return 30;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [generalScores, individualScores, viewType]);

  const tierInfo = getStrengthTier(overallScore);

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-4 rounded-xl shadow-[4px_4px_0px_black] flex flex-col gap-3 w-full">
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-display font-black text-sm uppercase text-[var(--text-primary)] tracking-wider">
            {title}
          </h4>
          <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
            Telemetric Balance
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-mono font-bold text-2xl" style={{ color: tierInfo.color }}>
            {overallScore}
          </span>
          <span className="text-[8px] font-display font-extrabold tracking-wide uppercase" style={{ color: tierInfo.color }}>
            {tierInfo.label}
          </span>
        </div>
      </div>

      <div className="w-full h-52 mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="rgba(255, 255, 255, 0.08)" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#A3A3A3', fontSize: viewType === 'individual' ? 8 : 10, fontFamily: 'Outfit' }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: '#888888', fontSize: 8 }}
              axisLine={false}
            />
            <Radar
              name="Strength Score"
              dataKey="A"
              stroke="#B44FE8"
              fill="#B44FE8"
              fillOpacity={0.25}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/**
 * MuscleDetailPanel: Interactive panel showing stats, historical line charts, or recovery meters.
 */
export const MuscleDetailPanel = ({ muscleKey, fatigueScore, strengthScore, mode }) => {
  const getLabel = (key) => {
    const labels = {
      // General groups
      chest: 'Chest / Pectorals',
      back: 'Back Group',
      shoulders: 'Shoulders / Delts',
      arms: 'Arms Group',
      legs: 'Legs Group',
      core: 'Core & Abs',
      // Individual muscles
      traps: 'Trapezius (Traps)',
      lats: 'Latissimus Dorsi (Lats)',
      lower_back: 'Lower Back',
      biceps: 'Biceps Brachii',
      triceps: 'Triceps Brachii',
      forearms: 'Forearms',
      abs: 'Abdominals (Abs)',
      obliques: 'Obliques',
      quads: 'Quadriceps (Quads)',
      hamstrings: 'Hamstrings',
      glutes: 'Gluteals (Glutes)',
      calves: 'Calves'
    };
    return labels[key] || key;
  };

  // Mock historical strength data based on score for visual parity
  const mockHistoryData = useMemo(() => {
    if (!strengthScore) return [];
    const base = strengthScore;
    return [
      { date: 'Apr 1', score: Math.round(base * 0.82) },
      { date: 'Apr 15', score: Math.round(base * 0.90) },
      { date: 'Apr 29', score: Math.round(base * 0.94) },
      { date: 'May 13', score: base }
    ];
  }, [strengthScore]);

  // Fatigue specific info
  const recoveryHrs = useMemo(() => {
    if (!fatigueScore) return 'Fully Recovered';
    if (fatigueScore > 100) return '48 - 72 hours (High Overload)';
    if (fatigueScore >= 30) return '24 - 48 hours (Active Recovery)';
    return 'Fully Recovered (<12 hours)';
  }, [fatigueScore]);

  const fatigueColor = useMemo(() => {
    if (!fatigueScore) return '#22C55E';
    if (fatigueScore > 100) return '#EF4444';
    if (fatigueScore >= 30) return '#F59E0B';
    return '#22C55E';
  }, [fatigueScore]);

  const strengthTier = getStrengthTier(strengthScore || 0);

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-4 rounded-xl shadow-[4px_4px_0px_black] w-full flex flex-col gap-4">
      {muscleKey ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono text-[var(--text-secondary)] uppercase tracking-wider">
                Telemetry Target
              </span>
              <span className="font-display font-black text-xl text-white uppercase tracking-tight mt-0.5">
                {getLabel(muscleKey)}
              </span>
            </div>
            
            {mode === 'fatigue' ? (
              <div 
                className="flex flex-col items-center border px-3 py-1.5 rounded-lg bg-black font-mono font-black"
                style={{ borderColor: fatigueColor }}
              >
                <span className="text-lg" style={{ color: fatigueColor }}>
                  {fatigueScore}%
                </span>
                <span className="text-[8px] text-[var(--text-muted)] uppercase">Fatigue</span>
              </div>
            ) : (
              <div 
                className="flex flex-col items-center border px-3 py-1.5 rounded-lg bg-black font-mono font-black"
                style={{ borderColor: strengthTier.color }}
              >
                <span className="text-lg" style={{ color: strengthTier.color }}>
                  {strengthScore}
                </span>
                <span className="text-[8px] text-[var(--text-muted)] uppercase">Strength</span>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] pt-3 flex flex-col gap-2">
            {mode === 'fatigue' ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Clock size={14} className="text-[var(--primary)]" />
                  <span>Estimated Recovery Time:</span>
                  <span className="text-white font-bold">{recoveryHrs}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <AlertCircle size={14} className="text-[var(--secondary)]" />
                  <span>Workout Status:</span>
                  <span className="text-white font-bold">
                    {fatigueScore > 100 
                      ? 'Overload detected. Rest recommended today.' 
                      : fatigueScore >= 30 
                      ? 'Moderately fatigued. Low intensity allowed.' 
                      : 'Fully fresh. Target for heavy compounds.'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                    <Trophy size={14} className="text-yellow-400" />
                    <span>Achievement Class:</span>
                  </div>
                  <span className="font-display font-black" style={{ color: strengthTier.color }}>
                    {strengthTier.label}
                  </span>
                </div>

                {/* Recharts progression curve */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={10} /> Strength Curve (Last 4 Weeks)
                  </span>
                  <div className="w-full h-24 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={mockHistoryData}>
                        <XAxis 
                          dataKey="date" 
                          tick={{ fill: '#888888', fontSize: 8 }} 
                          axisLine={false} 
                          tickLine={false}
                        />
                        <YAxis 
                          domain={[0, 100]} 
                          hide 
                        />
                        <RechartsTooltip 
                          contentStyle={{ backgroundColor: '#111', borderColor: '#222', fontSize: 10 }} 
                          labelStyle={{ color: '#fff' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="score" 
                          stroke={strengthTier.color} 
                          strokeWidth={2.5} 
                          dot={{ r: 3, fill: strengthTier.color, stroke: '#000', strokeWidth: 1.5 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full py-8 text-center text-xs text-[var(--text-secondary)] font-sans flex flex-col items-center justify-center gap-2 uppercase font-semibold tracking-wider">
          <Compass size={24} className="text-[var(--primary)] animate-pulse" />
          <span>Tap a muscle group to view recovery telemetry & strength ratings</span>
        </div>
      )}
    </div>
  );
};

/**
 * MuscleMap: The main mannequin container.
 */
export const MuscleMap = ({ 
  fatigueData = {}, 
  strengthData = {}, 
  activeMuscle = null, 
  onMuscleClick = () => {},
  mode = 'fatigue',
  setMode = () => {},
  view = 'front',
  setView = () => {},
  viewType = 'grouped',
  setViewType = () => {}
}) => {
  const [hovered, setHovered] = useState(null);

  // Strength scores detailed (has the 19 SVG path keys)
  const detailedScores = strengthData.detailed || {};

  // Retrieve matching leader line coordinates if active
  const activeLeaderLine = useMemo(() => {
    if (!activeMuscle) return null;
    return LEADER_LINES[view]?.[activeMuscle] || null;
  }, [activeMuscle, view]);

  return (
    <div className="flex flex-col items-center gap-5 w-full">
      {/* Toggles Container */}
      <div className="flex flex-col md:flex-row gap-3 w-full justify-between items-center border-b border-[var(--border)] pb-4">
        <div className="flex flex-wrap gap-3 items-center justify-center">
          <FrontBackToggle view={view} onChange={setView} />
          <ViewTypeToggle viewType={viewType} onChange={setViewType} />
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
      </div>

      {/* Mannequin Graphic Core */}
      <div className="relative w-full max-w-[280px] h-[380px] flex items-center justify-center bg-[var(--bg-elevated)] border-2 border-black rounded-2xl shadow-[4px_4px_0px_black] p-4 overflow-hidden">
        {/* Futuristic Grid Overlay lines */}
        <div className="absolute inset-0 pointer-events-none opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* Outer Aim Brackets */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[var(--text-muted)] opacity-30" />
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[var(--text-muted)] opacity-30" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[var(--text-muted)] opacity-30" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[var(--text-muted)] opacity-30" />

        <AnimatePresence mode="wait">
          {view === 'front' ? (
            <motion.div
              key="front-overlay"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <FrontBodyOverlay
                fatigueData={fatigueData}
                strengthData={strengthData}
                mode={mode}
                activeMuscle={activeMuscle}
                onMuscleClick={onMuscleClick}
                onMuscleHover={(h) => setHovered(h.active ? h.key : null)}
                viewType={viewType}
              />
            </motion.div>
          ) : (
            <motion.div
              key="back-overlay"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <BackBodyOverlay
                fatigueData={fatigueData}
                strengthData={strengthData}
                mode={mode}
                activeMuscle={activeMuscle}
                onMuscleClick={onMuscleClick}
                onMuscleHover={(h) => setHovered(h.active ? h.key : null)}
                viewType={viewType}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* HUD Leader Line Graphic Overlay */}
        <AnimatePresence>
          {activeMuscle && activeLeaderLine && (
            <svg 
              className="absolute inset-0 pointer-events-none z-30 w-full h-full"
              viewBox="0 0 240 420"
            >
              {/* Pulsing Target Ring at the muscle location */}
              <circle cx={activeLeaderLine.from.x} cy={activeLeaderLine.from.y} r="3" fill="#00f0ff" />
              <motion.circle 
                cx={activeLeaderLine.from.x} 
                cy={activeLeaderLine.from.y} 
                r="6" 
                fill="none" 
                stroke="#00f0ff" 
                strokeWidth="1" 
                initial={{ scale: 0.8, opacity: 0.8 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              />
              
              {/* Dotted angled leader line */}
              <path 
                d={`M ${activeLeaderLine.from.x} ${activeLeaderLine.from.y} 
                    L ${activeLeaderLine.to.x} ${activeLeaderLine.to.y} 
                    L ${activeLeaderLine.to.x + (activeLeaderLine.align === 'left' ? -25 : 25)} ${activeLeaderLine.to.y}`}
                fill="none"
                stroke="#00f0ff"
                strokeWidth="1.2"
                strokeDasharray="2,2"
              />
              
              {/* Nomenclature Labels */}
              <text 
                x={activeLeaderLine.to.x + (activeLeaderLine.align === 'left' ? -30 : 30)} 
                y={activeLeaderLine.to.y - 4} 
                fill="#00f0ff" 
                fontSize="9" 
                fontFamily="Barlow Condensed" 
                fontWeight="800" 
                textAnchor={activeLeaderLine.align === 'left' ? 'end' : 'start'}
                letterSpacing="1"
              >
                {activeLeaderLine.label}
              </text>
              <text 
                x={activeLeaderLine.to.x + (activeLeaderLine.align === 'left' ? -30 : 30)} 
                y={activeLeaderLine.to.y + 7} 
                fill="#888888" 
                fontSize="7" 
                fontFamily="Outfit" 
                fontStyle="italic"
                textAnchor={activeLeaderLine.align === 'left' ? 'end' : 'start'}
              >
                {activeLeaderLine.sub}
              </text>
            </svg>
          )}
        </AnimatePresence>

        {/* Hover label HUD overlay (Only displays on desktop if hovering) */}
        {hovered && !activeMuscle && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/90 border border-[var(--border)] rounded text-[9px] font-mono text-white tracking-widest uppercase pointer-events-none select-none z-20">
            {hovered}
          </div>
        )}
      </div>
    </div>
  );
};

export default MuscleMap;
