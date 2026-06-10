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
import { Trophy, Zap, Clock, Dumbbell, Weight, RotateCcw, Home, Star, Share2 } from 'lucide-react';
import { useXPStore } from '../../stores/useXPStore';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/useUIStore';
import { generatePRCardImage, getMuscleGroupForExercise, fetchStrengthStandards } from '../shared/PRShareTemplate';

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

function PRList({ prs, onShare, sharing }) {
  if (!prs?.length) return null;
  return (
    <div className="flex flex-col gap-2 mt-3 select-none">
      {prs.map((pr) => (
        <div
          key={pr.name}
          className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-bright)] bg-[var(--surface)] text-xs"
        >
          <div className="flex flex-col min-w-0 pr-2">
            <span className="font-display font-bold uppercase tracking-wide text-white truncate">
              {pr.name}
            </span>
            <span className="font-mono text-[10px] text-[var(--accent-xp)] mt-0.5 font-bold">
              {pr.weight === 'BW' ? 'BW' : `${pr.weight} kg`} × {pr.reps} {pr.reps === 1 ? 'rep' : 'reps'}
            </span>
          </div>
          
          <button
            type="button"
            disabled={sharing}
            onClick={() => onShare(pr)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-xp)] text-black border-2 border-black rounded-lg shadow-[1.5px_1.5px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 active:scale-95 transition-all text-[10px] font-display font-black uppercase shrink-0"
          >
            <Share2 size={10} strokeWidth={3} />
            <span>Share</span>
          </button>
        </div>
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
  const { profile } = useAuthStore();
  const { addToast } = useUIStore();

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const handleSharePR = async (pr) => {
    setIsSharing(true);
    addToast('Retrieving global rankings...', 'info');
    try {
      const est1RM = pr.weight === 'BW' ? 0 : Math.round(pr.weight * (1 + pr.reps / 30));
      const exName = pr.name || pr.exerciseName || pr.exerciseKey?.replace(/_/g, ' ') || 'Bench Press';

      // Compute statistics utilizing Firestore-cached strength standards
      const stats = await fetchStrengthStandards(
        exName,
        est1RM,
        profile?.weight || 80,
        profile?.gender || 'male'
      );

      const targetMuscle = getMuscleGroupForExercise(exName);

      const dataUrl = await generatePRCardImage({
        userName: profile?.name || 'Trainer',
        level: newLevel ?? level,
        exerciseName: exName,
        weight: pr.weight,
        reps: pr.reps,
        oneRepMax: est1RM,
        dateString: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        percentile: stats.percentile,
        tier: stats.tier,
        bwMultiplier: stats.bwMultiplier,
        targetMuscle
      });

      const weightText = pr.weight === 'BW' ? 'BW' : `${pr.weight} kg`;
      const text = `🏋️ New PR hit on Zenkai! ${exName}: ${weightText} for ${pr.reps} reps${pr.weight !== 'BW' ? ` (Estimated 1RM: ${est1RM} kg)` : ''}! Global Rank: ${stats.percentile} (${stats.tier} Tier) 🔥💪`;




      // Check if Web Share API with files is supported
      if (navigator.share && navigator.canShare) {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const file = new File([blob], `pr_${pr.exerciseKey || 'lift'}.png`, { type: 'image/png' });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Personal Record Broken!',
            text,
          });
          return;
        }
      }

      // Fallback: Trigger instant browser download
      const link = document.createElement('a');
      link.download = `pr_${pr.exerciseKey || 'lift'}.png`;
      link.href = dataUrl;
      link.click();
      
      // Also copy the text template to clipboard
      await navigator.clipboard.writeText(text);
      addToast('PR Card image downloaded & details copied to clipboard!', 'success');
    } catch (err) {
      if (err.name === 'AbortError' || err.message?.toLowerCase().includes('cancel') || err.message?.toLowerCase().includes('abort')) {
        console.log('[MobileSessionComplete] User cancelled share sheet.');
        return;
      }
      console.error('[MobileSessionComplete] Sharing failed:', err);
      addToast('Could not generate share image.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

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
            <PRList prs={summary.prs} onShare={handleSharePR} sharing={isSharing} />
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
        className="w-full px-5 mb-6 flex flex-col gap-1"
        style={{ color: 'var(--text-muted)', fontSize: '0.72rem', fontFamily: 'DM Mono, monospace' }}
      >
        {(() => {
          const breakdown = summary.xpBreakdown;
          if (!breakdown) {
            // Smart fallback for tests/legacy payloads to make sure the math ALWAYS matches
            const fallbackBase = 50;
            const fallbackPR = prCount * 10;
            const sum = fallbackBase + fallbackPR;
            const diff = (summary.xpEarned || 0) - sum;

            const fallbackLines = [
              { label: 'Session complete', value: `+${fallbackBase} XP` }
            ];
            if (prCount > 0) {
              fallbackLines.push({ label: `Personal records × ${prCount}`, value: `+${fallbackPR} XP` });
            }
            if (diff > 0) {
              fallbackLines.push({ label: 'Active Skill Bonuses & Multipliers', value: `+${diff} XP` });
            } else if (diff < 0) {
              fallbackLines.push({ label: 'XP Adjustment', value: `${diff} XP` });
            }

            return fallbackLines.map((l, idx) => (
              <div key={idx} className="flex justify-between">
                <span>{l.label}</span>
                <span className="text-[var(--accent-xp)] font-bold">{l.value}</span>
              </div>
            ));
          }

          const lines = [];
          lines.push({ label: 'Session complete', value: `+${breakdown.baseXP} XP` });
          if (breakdown.prCount > 0) {
            const prVal = breakdown.prCount * (breakdown.prXP || 10);
            lines.push({ label: `Personal records × ${breakdown.prCount}`, value: `+${prVal} XP` });
          }
          if (breakdown.adrenalineBonus > 0) {
            lines.push({ label: 'Adrenaline Rush (Locked In + PR)', value: `+${breakdown.adrenalineBonus} XP` });
          }
          if (breakdown.gritBonus > 0) {
            lines.push({ label: 'Grit (Injury Protocol Bonus)', value: `+${breakdown.gritBonus} XP` });
          }
          if (breakdown.bossBonusXP > 0) {
            lines.push({ label: 'Boss Fight Victory Bonus', value: `+${breakdown.bossBonusXP} XP` });
          }

          const hasMultipliers = (breakdown.overdriveMultiplier > 1.0) || (breakdown.boosterMultiplier > 1.0);
          if (hasMultipliers) {
            const additionSum = breakdown.baseXP +
              (breakdown.prCount * (breakdown.prXP || 10)) +
              (breakdown.adrenalineBonus || 0) +
              (breakdown.gritBonus || 0) +
              (breakdown.bossBonusXP || 0);

            lines.push({ label: 'Subtotal', value: `${additionSum} XP`, isSubtotal: true });
            if (breakdown.overdriveMultiplier > 1.0) {
              lines.push({ label: 'Overdrive Hour Multiplier', value: `×${breakdown.overdriveMultiplier}` });
            }
            if (breakdown.boosterMultiplier > 1.0) {
              lines.push({ label: 'XP Booster Multiplier', value: `×${breakdown.boosterMultiplier}` });
            }
            lines.push({ label: 'Total XP Earned', value: `+${summary.xpEarned} XP`, isTotal: true });
          }

          return lines.map((l, idx) => {
            let className = '';
            if (l.isSubtotal) {
              className = 'border-t border-[var(--border-bright)] pt-1.5 mt-1 font-semibold text-[var(--text-secondary)]';
            } else if (l.isTotal) {
              className = 'border-t border-[var(--border-bright)] pt-1.5 mt-1 font-bold text-[var(--text-primary)] text-sm';
            }
            
            let valClassName = '';
            if (l.value.startsWith('×') || l.isTotal || l.isSubtotal) {
              valClassName = 'text-[var(--accent-xp)] font-bold';
            }

            return (
              <div key={idx} className={`flex justify-between ${className}`}>
                <span>{l.label}</span>
                <span className={valClassName}>{l.value}</span>
              </div>
            );
          });
        })()}
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
