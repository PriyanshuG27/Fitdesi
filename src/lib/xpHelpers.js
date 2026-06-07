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
    // Elite tier (31+) — keep counting upward
    const eliteXPPerLevel = 1000; // 1 000 XP per level beyond 31
    const xpIntoElite = raw - current.xpRequired;
    const levelsIntoElite = Math.floor(xpIntoElite / eliteXPPerLevel);
    const level = current.level + levelsIntoElite;
    const xpToNextLevel = eliteXPPerLevel - (xpIntoElite % eliteXPPerLevel);
    return { level, levelName: current.name, xpToNextLevel };
  }

  // Interpolate within tier
  const tierXPSpan = next.xpRequired - current.xpRequired;
  const levelCount = next.level - current.level; // number of sub-levels in this tier
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
    // Already logged today — no change
    newStreak = currentStreak;
  } else if (diffDays === 1) {
    newStreak = currentStreak + 1;
  } else {
    newStreak = 1; // streak broken
  }

  const streakBonuses = [];
  if (newStreak >= 30 && (currentStreak < 30 || diffDays === 1)) {
    streakBonuses.push('streak_30');
  } else if (newStreak >= 7 && (currentStreak < 7 || diffDays === 1)) {
    streakBonuses.push('streak_7');
  }

  return { newStreak, streakBonuses };
}
