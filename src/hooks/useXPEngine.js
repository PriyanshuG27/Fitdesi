/**
 * useXPEngine.js
 *
 * The reward-system core of FitDesi.
 * Handles XP awards, level derivation, streak evaluation,
 * and Firestore persistence — all in one place.
 *
 * LEVEL THRESHOLDS (interpolated between anchors):
 *   Rookie      levels  1-5    (0 XP to start)
 *   Challenger  levels  6-15   (1 000 XP to start)
 *   Athlete     levels 16-30   (7 000 XP to start)
 *   Elite       levels 31+     (30 000 XP to start)
 *
 * Within each tier the XP-per-level is evenly distributed between
 * the current anchor threshold and the next anchor threshold.
 *
 * Example usage:
 *   const { awardXP } = useXPEngine();
 *   const result = await awardXP(uid, 'session_logged', 55);
 *   // { newXP: 55, levelUp: false, newLevel: 1, newLevelName: 'Rookie' }
 */

import { useCallback } from 'react';
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useXPStore } from '../stores/useXPStore';

// ─── Level Anchor Thresholds ──────────────────────────────────────────────────

export const LEVEL_THRESHOLDS = [
  { level: 1,  name: 'Rookie',     xpRequired: 0      },
  { level: 6,  name: 'Challenger', xpRequired: 1000   },
  { level: 16, name: 'Athlete',    xpRequired: 7000   },
  { level: 31, name: 'Elite',      xpRequired: 30000  },
];

// ─── XP Event Award Table ─────────────────────────────────────────────────────

export const XP_AWARDS = {
  session_logged:      55,   // base session complete
  pr_hit:              25,   // per personal record in a session
  challenge_join:      10,
  challenge_complete: 100,
  streak_7:            75,
  streak_30:          200,
  onboarding_complete: 20,   // one-time
  plan_generated:       5,
};

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

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useXPEngine() {
  const { setXP, awardXP: awardXPLocally } = useXPStore();

  /**
   * Awards XP to a user for a given source event.
   *
   * 1. Reads current XP from Firestore (or falls back to xpStore).
   * 2. Computes new total and derives level.
   * 3. Writes updateDoc on users/{uid} and addDoc to xpLog subcollection.
   * 4. Syncs xpStore locally.
   *
   * @param {string} uid
   * @param {string} source      - Must be a key of XP_AWARDS or pass a custom amount.
   * @param {number} [amount]    - Override amount; if omitted, XP_AWARDS[source] is used.
   * @param {object} [meta]      - Optional: { sessionId, challengeId } for log metadata.
   * @returns {Promise<{ newXP: number, levelUp: boolean, newLevel: number, newLevelName: string }>}
   */
  const awardXP = useCallback(async (uid, source, amount, meta = {}) => {
    if (!uid) throw new Error('[useXPEngine] uid is required');

    const xpAmount = typeof amount === 'number' ? amount : (XP_AWARDS[source] ?? 0);
    if (xpAmount <= 0) {
      console.warn(`[useXPEngine] awardXP called with 0 XP for source "${source}"`);
      return null;
    }

    try {
      // 1. Read current XP from Firestore
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const currentXP = typeof userData.xp === 'number' ? userData.xp : 0;

      // 2. Compute new level
      const newXP = currentXP + xpAmount;
      const prevDerived = deriveLevelFromXP(currentXP);
      const newDerived = deriveLevelFromXP(newXP);
      const levelUp = newDerived.level > prevDerived.level;

      // 3. Batch: update user doc + add xpLog entry
      const updatePayload = {
        xp:        newXP,
        level:     newDerived.level,
        levelName: newDerived.levelName,
      };

      const logEntry = {
        source,
        amount:    xpAmount,
        timestamp: serverTimestamp(),
        ...(meta.sessionId   ? { sessionId:   meta.sessionId }   : {}),
        ...(meta.challengeId ? { challengeId: meta.challengeId } : {}),
      };

      // Execute writes concurrently — they're independent docs
      await Promise.all([
        updateDoc(userRef, updatePayload),
        addDoc(collection(db, 'users', uid, 'xpLog'), logEntry),
      ]);

      // 4. Sync local store
      // awardXPLocally just adds the delta; setXP hydrates the full state.
      setXP(newXP, userData.streak ?? 0);

      return {
        newXP,
        levelUp,
        newLevel:     newDerived.level,
        newLevelName: newDerived.levelName,
      };
    } catch (err) {
      console.error('[useXPEngine] awardXP failed:', err);
      // Optimistic local update so UI isn't blocked by a network hiccup
      awardXPLocally(xpAmount);
      return null;
    }
  }, [setXP, awardXPLocally]);

  /**
   * Hydrates the xpStore from Firestore on sign-in or app mount.
   *
   * @param {string} uid
   */
  const loadXP = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        setXP(data.xp ?? 0, data.streak ?? 0);
      }
    } catch (err) {
      console.error('[useXPEngine] loadXP failed:', err);
    }
  }, [setXP]);

  return { awardXP, loadXP, deriveLevelFromXP, evaluateStreak };
}
