/**
 * useXPEngine.js
 *
 * The reward-system core of Zenkai.
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
 *
 * TRANSACTION FIX: awardXP now uses runTransaction to atomically read → compute → write XP.
 * This prevents concurrent XP awards (e.g. session_logged + streak_7 firing back-to-back)
 * from racing: without a transaction both reads see the same currentXP and one award is lost.
 */

import { useCallback } from 'react';
import {
  doc,
  addDoc,
  collection,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useXPStore } from '../stores/useXPStore';
import { LEVEL_THRESHOLDS, deriveLevelFromXP, evaluateStreak } from '../lib/xpHelpers';

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


// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useXPEngine() {
  const { setXP, awardXP: awardXPLocally } = useXPStore();

  /**
   * Awards XP to a user for a given source event.
   *
   * Uses a Firestore transaction to atomically read → compute → write XP,
   * preventing concurrent awards from silently losing one another.
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
      const userRef = doc(db, 'users', uid);

      // Atomic transaction: read current XP → compute new XP → write — all in one round trip.
      // No other concurrent write can interleave between the read and write.
      const result = await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};
        const currentXP = typeof userData.xp === 'number' ? userData.xp : 0;

        const newXP = currentXP + xpAmount;
        const prevDerived = deriveLevelFromXP(currentXP);
        const newDerived  = deriveLevelFromXP(newXP);
        const levelUp     = newDerived.level > prevDerived.level;

        transaction.update(userRef, {
          xp:        newXP,
          level:     newDerived.level,
          levelName: newDerived.levelName,
        });

        return { newXP, levelUp, newDerived, userData };
      });

      // Write xpLog entry AFTER transaction (outside transaction to avoid contention)
      const logEntry = {
        source,
        amount:    xpAmount,
        timestamp: serverTimestamp(),
        ...(meta.sessionId   ? { sessionId:   meta.sessionId }   : {}),
        ...(meta.challengeId ? { challengeId: meta.challengeId } : {}),
      };
      addDoc(collection(db, 'users', uid, 'xpLog'), logEntry).catch((err) => {
        // Non-critical: log write failure doesn't affect XP correctness
        console.warn('[useXPEngine] xpLog write failed (XP already saved):', err.message);
      });

      // Sync local store from transaction result
      setXP(result.newXP, result.userData.streak ?? 0);

      return {
        newXP:        result.newXP,
        levelUp:      result.levelUp,
        newLevel:     result.newDerived.level,
        newLevelName: result.newDerived.levelName,
      };
    } catch (err) {
      console.error('[useXPEngine] awardXP transaction failed:', err);
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
      const userRef = doc(db, 'users', uid);
      const userSnap = await runTransaction(db, async (t) => t.get(userRef));
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
