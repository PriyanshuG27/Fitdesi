import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWeeklyRecap } from '../../hooks/useWeeklyRecap';
import { WeeklyRecapScreen } from '../shared/WeeklyRecapScreen';

export const DesktopDashboard = () => {
  const {
    recap,
    isRecapDay,
    weekId: recapWeekId,
    hasSeen,
    markAsSeen,
  } = useWeeklyRecap();
  const [showRecapScreen, setShowRecapScreen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70dvh] text-center p-6 bg-[var(--bg-oled)] text-[var(--text-primary)] gap-8">
      {/* ─── WEEKLY RECAP BANNER ────────────────────────────────────────────── */}
      {isRecapDay && !hasSeen && recap && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-[var(--secondary)] bg-[var(--surface)] p-6 rounded-lg shadow-[4px_4px_0px_rgba(0,0,0,1)] flex items-center justify-between cursor-pointer hover:border-[var(--text-primary)] transition-all animate-pulse text-left max-w-md w-full"
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

      <div className="flex flex-col items-center">
        <h1 className="font-display text-5xl font-extrabold tracking-widest text-[var(--primary)] uppercase drop-shadow-[0_0_15px_var(--primary-glow)] animate-pulse">
          Desktop Dashboard
        </h1>
        <p className="text-[var(--text-secondary)] font-sans text-base mt-3 tracking-wider max-w-md">
          FITDESI Desktop Dashboard Shell
        </p>
      </div>
    </div>
  );
};
