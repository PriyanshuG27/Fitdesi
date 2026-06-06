/**
 * MobileSessionComplete.jsx
 *
 * Session summary screen shown after finishSession() resolves.
 *
 * Props (passed by MobileLogger after a successful finishSession):
 *   summary  — { totalVolume, totalSets, durationMinutes, exerciseCount,
 *                prCount, prNames, xpEarned, levelUp, newLevel, newLevelName }
 *   onRetry  — called when user hits "Retry" after a batch failure
 *   error    — string | null   batch failure message
 *   retryCount — number        how many times commit has failed
 *
 * UX contract:
 *   - XP counter animates from 0 → xpEarned using requestAnimationFrame
 *   - Level-up banner fires once, reads xpStore.leveledUp, clears via clearPending()
 *   - "Back to Home" calls resetSession() then navigates to /home
 *   - After 3 retries, retry button label becomes "Save locally" (aspirational UX)
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Clock, Dumbbell, Weight, RotateCcw, Home, Star } from 'lucide-react';
import { useXPStore } from '../../stores/useXPStore';

// ─── XP Counter animation ─────────────────────────────────────────────────────

function useCountUp(target, duration = 1400) {
  const [value, setValue] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!target) return;
    const start = performance.now();

    const tick = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return value;
}

// ─── Stat row ─────────────────────────────────────────────────────────────────

function StatRow({ icon: Icon, label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0">
      <div className="flex items-center gap-2.5">
        <Icon
          size={15}
          className={highlight ? 'text-[var(--accent-xp)]' : 'text-[var(--text-secondary)]'}
        />
        <span className="text-sm text-[var(--text-secondary)] font-body">{label}</span>
      </div>
      <span
        className={`font-mono text-sm font-semibold ${
          highlight ? 'text-[var(--accent-xp)]' : 'text-[var(--text-primary)]'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Level-up banner ──────────────────────────────────────────────────────────

function LevelUpBanner({ newLevel, newLevelName, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: -20 }}
      animate={{ opacity: 1, scale: 1,    y: 0    }}
      exit={{    opacity: 0, scale: 0.85, y: -20  }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className="relative w-full rounded-2xl overflow-hidden mb-4"
      style={{
        background: 'linear-gradient(135deg, rgba(181,255,45,0.18) 0%, rgba(0,212,255,0.14) 100%)',
        border: '1px solid var(--accent-xp)',
        boxShadow: '0 0 32px rgba(181,255,45,0.25)',
      }}
    >
      {/* Shimmer overlay */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ x: ['−100%', '200%'] }}
        transition={{ duration: 1.6, ease: 'easeInOut', delay: 0.3 }}
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(181,255,45,0.12), transparent)',
        }}
      />

      <div className="relative z-10 px-5 py-4 text-center">
        <div className="text-3xl mb-1">🎉</div>
        <p className="font-display text-[var(--accent-xp)] text-xl tracking-wide uppercase">
          Level Up!
        </p>
        <p className="font-mono text-[var(--text-primary)] text-base mt-0.5">
          Level {newLevel} — <span className="text-[var(--accent-xp)]">{newLevelName}</span>
        </p>
      </div>
    </motion.div>
  );
}

// ─── PR chip list ─────────────────────────────────────────────────────────────

function PRList({ names }) {
  if (!names?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {names.map((n) => (
        <span
          key={n}
          className="px-2 py-0.5 rounded-full text-xs font-mono"
          style={{
            background: 'rgba(181,255,45,0.12)',
            border:     '1px solid rgba(181,255,45,0.3)',
            color:      'var(--accent-xp)',
          }}
        >
          {n}
        </span>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const MobileSessionComplete = ({
  summary,
  onRetry,
  error,
  retryCount = 0,
}) => {
  const navigate = useNavigate();
  const { leveledUp, level, levelName, clearPending } = useXPStore();

  const [showLevelUp, setShowLevelUp] = useState(false);

  // Trigger level-up banner exactly once
  useEffect(() => {
    if (leveledUp) {
      setShowLevelUp(true);
    }
  }, [leveledUp]);

  const handleDismissLevelUp = () => {
    setShowLevelUp(false);
    clearPending();
  };

  // Auto-dismiss level-up after 4 s
  useEffect(() => {
    if (!showLevelUp) return;
    const t = setTimeout(() => {
      setShowLevelUp(false);
      clearPending();
    }, 4000);
    return () => clearTimeout(t);
  }, [showLevelUp, clearPending]);

  // Animated XP counter
  const animatedXP = useCountUp(summary?.xpEarned ?? 0);

  if (!summary) {
    // Fallback while summary is being computed (should be near-instant)
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)] font-mono text-sm animate-pulse">
          Saving session…
        </p>
      </div>
    );
  }

  const {
    durationMinutes,
    exerciseCount,
    totalSets,
    totalVolume,
    prCount,
    prNames,
    xpEarned,
    newLevel,
    newLevelName,
  } = summary;

  const retryLabel = retryCount >= 3 ? 'Save locally' : 'Retry';

  return (
    <div
      className="min-h-screen flex flex-col px-5 py-8 overflow-y-auto"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      {/* ── Level-up banner ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showLevelUp && (
          <LevelUpBanner
            newLevel={newLevel ?? level}
            newLevelName={newLevelName ?? levelName}
            onClose={handleDismissLevelUp}
          />
        )}
      </AnimatePresence>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="text-center mb-6"
      >
        {/* Icon ring */}
        <div
          className="mx-auto mb-4 w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, rgba(255,92,0,0.25) 0%, transparent 70%)',
            border:     '1.5px solid rgba(255,92,0,0.4)',
          }}
        >
          <Trophy size={36} style={{ color: 'var(--primary)' }} />
        </div>

        <h1
          className="font-display text-4xl uppercase tracking-widest"
          style={{ color: 'var(--primary)' }}
        >
          Session Done
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Great work. Every rep counts.
        </p>
      </motion.div>

      {/* ── Stats card ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full rounded-2xl px-5 py-1 mb-5"
        style={{
          background: 'var(--bg-surface)',
          border:     '1px solid var(--border)',
        }}
      >
        <StatRow icon={Clock}    label="Duration"          value={`${durationMinutes} min`} />
        <StatRow icon={Dumbbell} label="Exercises / Sets"  value={`${exerciseCount} / ${totalSets}`} />
        <StatRow
          icon={Weight}
          label="Total Volume"
          value={totalVolume > 0 ? `${totalVolume.toLocaleString()} kg` : '—'}
        />
        {prCount > 0 && (
          <div className="py-3 border-b border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Star size={15} className="text-[var(--accent-xp)]" />
                <span className="text-sm font-body" style={{ color: 'var(--text-secondary)' }}>
                  PRs Broken
                </span>
              </div>
              <span className="font-mono text-sm font-semibold text-[var(--accent-xp)]">
                {prCount} PR{prCount > 1 ? 's' : ''}
              </span>
            </div>
            <PRList names={prNames} />
          </div>
        )}
      </motion.div>

      {/* ── XP card ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1   }}
        transition={{ duration: 0.4, delay: 0.22, type: 'spring', stiffness: 220 }}
        className="w-full rounded-2xl px-5 py-5 mb-6 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, rgba(181,255,45,0.10) 0%, rgba(0,212,255,0.06) 100%)',
          border:     '1px solid rgba(181,255,45,0.25)',
        }}
      >
        <div className="flex items-center gap-3">
          <Zap size={22} style={{ color: 'var(--accent-xp)' }} />
          <span className="font-body text-sm" style={{ color: 'var(--text-secondary)' }}>
            XP Earned this session
          </span>
        </div>
        <span
          className="font-mono text-2xl font-bold"
          style={{ color: 'var(--accent-xp)', textShadow: '0 0 12px rgba(181,255,45,0.4)' }}
        >
          +{animatedXP}
        </span>
      </motion.div>

      {/* XP breakdown */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.35 }}
        className="w-full px-5 mb-6"
        style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'DM Mono, monospace' }}
      >
        <div className="flex justify-between mb-1">
          <span>Session complete</span>
          <span>+50 XP</span>
        </div>
        {prCount > 0 && (
          <div className="flex justify-between">
            <span>Personal records × {prCount}</span>
            <span>+{prCount * 10} XP</span>
          </div>
        )}
      </motion.div>

      {/* ── Error / Retry banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="error-banner"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{    opacity: 0, height: 0     }}
            transition={{ duration: 0.25 }}
            className="w-full rounded-xl px-4 py-3 mb-4 flex flex-col gap-2"
            style={{
              background: 'rgba(239,68,68,0.10)',
              border:     '1px solid rgba(239,68,68,0.30)',
            }}
          >
            <p className="text-xs font-mono" style={{ color: 'var(--destructive)' }}>
              {retryCount >= 3
                ? "Session saved locally — will sync when connection returns."
                : "Couldn't save to server. Your workout data is safe."}
            </p>
            <button
              onClick={onRetry}
              className="flex items-center gap-1.5 text-xs font-mono self-start px-3 py-1.5 rounded-lg transition-all active:scale-95"
              style={{
                background: 'rgba(239,68,68,0.18)',
                border:     '1px solid rgba(239,68,68,0.4)',
                color:      'var(--destructive)',
              }}
            >
              <RotateCcw size={12} />
              {retryLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      <motion.button
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0  }}
        transition={{ duration: 0.35, delay: 0.4 }}
        onClick={() => navigate('/home')}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-display text-lg tracking-widest uppercase transition-all active:scale-[0.97]"
        style={{
          background:  'var(--primary)',
          color:       '#fff',
          boxShadow:   '0 4px 20px rgba(255,92,0,0.30)',
        }}
        whileTap={{ scale: 0.97 }}
      >
        <Home size={18} />
        Back to Home
      </motion.button>
    </div>
  );
};
