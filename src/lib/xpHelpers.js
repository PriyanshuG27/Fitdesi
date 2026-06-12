/**
 * xpHelpers.js
 * Shared utility functions for XP calculations, level derivation, and streak evaluation.
 * Kept pure and side-effect free to prevent circular dependency issues.
 */

// ─── Level Anchor Thresholds ──────────────────────────────────────────────────
export const LEVEL_THRESHOLDS = [
  { level: 1,  name: 'Rookie',     xpRequired: 0      },
  { level: 6,  name: 'Challenger', xpRequired: 1000   },
  { level: 16, name: 'Athlete',    xpRequired: 7000   },
  { level: 31, name: 'Elite',      xpRequired: 30000  },
];

// ─── Level Derivation ─────────────────────────────────────────────────────────
/**
 * Derives level number and name from raw XP using linear interpolation
 * between the defined LEVEL_THRESHOLDS anchors.
 *
 * @param {number} xp
 * @returns {{ level: number, levelName: string, xpToNextLevel: number }}
 */
export function deriveLevelFromXP(xp) {
  const raw = Math.max(0, xp);

  // Find which tier bracket we're in
  let tierIdx = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (raw >= LEVEL_THRESHOLDS[i].xpRequired) {
      tierIdx = i;
      break;
    }
  }

  const current = LEVEL_THRESHOLDS[tierIdx];
  const next = LEVEL_THRESHOLDS[tierIdx + 1] ?? null;

  if (!next) {
    // Elite tier (31+): 2000 XP/level so it's always harder than Athlete (~1533 XP/level).
    // Previously was 1000 XP/level which made Elite cheaper — broken progression.
    const eliteXPPerLevel = 2000;
    const xpIntoElite = raw - current.xpRequired;
    const levelsIntoElite = Math.floor(xpIntoElite / eliteXPPerLevel);
    const level = current.level + levelsIntoElite;
    const xpToNextLevel = eliteXPPerLevel - (xpIntoElite % eliteXPPerLevel);
    return { level, levelName: current.name, xpToNextLevel };
  }

  // Interpolate within tier
  const tierXPSpan = next.xpRequired - current.xpRequired;
  const levelCount = next.level - current.level;
  const xpPerLevel = Math.floor(tierXPSpan / levelCount);
  const xpIntoTier = raw - current.xpRequired;
  const levelsIntoTier = Math.min(Math.floor(xpIntoTier / xpPerLevel), levelCount - 1);
  const level = current.level + levelsIntoTier;
  const xpEarnedThisSubLevel = xpIntoTier - levelsIntoTier * xpPerLevel;
  const xpToNextLevel = xpPerLevel - xpEarnedThisSubLevel;

  return { level, levelName: current.name, xpToNextLevel };
}

// ─── Streak Evaluation ────────────────────────────────────────────────────────
/**
 * Given the last workout date and current streak, returns the new streak count
 * and any bonus XP source keys that should fire.
 *
 * Bonus fires ONLY when crossing a milestone for the first time (currentStreak < threshold).
 * Bug fix: previously `|| diffDays === 1` caused the bonus to fire EVERY consecutive day
 * once you exceeded the threshold — an unlimited XP exploit.
 *
 * @param {Date|null} lastDate  - Date of last recorded session (or null)
 * @param {number}    currentStreak
 * @returns {{ newStreak: number, streakBonuses: string[] }}
 */
export function evaluateStreak(lastDate, currentStreak) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!lastDate) {
    return { newStreak: 1, streakBonuses: [] };
  }

  const prev = new Date(lastDate);
  prev.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today - prev) / (1000 * 60 * 60 * 24));

  let newStreak;
  if (diffDays === 0) {
    newStreak = currentStreak;      // Already logged today — no change
  } else if (diffDays === 1) {
    newStreak = currentStreak + 1;  // Consecutive day
  } else {
    newStreak = 1;                  // Streak broken
  }

  // Fire ONLY on the exact day the streak crosses the milestone.
  const streakBonuses = [];
  if (newStreak >= 30 && currentStreak < 30) {
    streakBonuses.push('streak_30');
  } else if (newStreak >= 7 && currentStreak < 7) {
    streakBonuses.push('streak_7');
  }

  return { newStreak, streakBonuses };
}

// ─── Aura & Title Expiration Helpers ──────────────────────────────────────────
export function isAuraActive(auraKey, powerUps) {
  if (!powerUps) return false;
  const until = powerUps[`unlocked_aura_${auraKey}_until`];
  if (!until) return false;
  const untilMs = typeof until.toDate === 'function' ? until.toDate().getTime() : new Date(until).getTime();
  return untilMs > Date.now();
}

export function isTitleActive(titleKey, powerUps) {
  if (!powerUps) return false;
  const until = powerUps[`unlocked_title_${titleKey}_until`];
  if (!until) return false;
  const untilMs = typeof until.toDate === 'function' ? until.toDate().getTime() : new Date(until).getTime();
  return untilMs > Date.now();
}

// ─── Avatar Glowing Styles Helper ─────────────────────────────────────────────
export function getAvatarStyle(aura, level, powerUps) {
  let style = {
    boxShadow: 'none',
    borderColor: 'var(--border)',
    borderWidth: '2px',
    borderStyle: 'solid'
  };
  
  let resolvedAura = aura;
  if (['crimson', 'golden', 'shadow'].includes(aura)) {
    if (!isAuraActive(aura, powerUps)) {
      resolvedAura = null; // Custom aura has expired
    }
  }
  
  if (resolvedAura === 'crimson') {
    style.boxShadow = '0 0 12px #ef4444';
    style.borderColor = '#ef4444';
  } else if (resolvedAura === 'golden') {
    style.boxShadow = '0 0 12px #eab308';
    style.borderColor = '#eab308';
  } else if (resolvedAura === 'shadow') {
    style.boxShadow = '0 0 12px #a855f7';
    style.borderColor = '#a855f7';
  } else {
    const lvl = parseInt(level, 10) || 1;
    if (lvl >= 21) {
      style.boxShadow = '0 0 16px #eab308';
      style.borderColor = '#eab308';
    } else if (lvl >= 11) {
      style.boxShadow = '0 0 12px #ef4444';
      style.borderColor = '#ef4444';
    } else if (lvl >= 6) {
      style.boxShadow = '0 0 8px #06b6d4';
      style.borderColor = '#06b6d4';
    }
  }
  return style;
}
