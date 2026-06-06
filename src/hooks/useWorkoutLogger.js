/**
 * useWorkoutLogger.js
 *
 * Session completion hook — owns the entire "finish workout" flow.
 *
 * ─── finishSession(uid) ────────────────────────────────────────────────────────
 *
 *  PRE-BATCH (deterministic, runs once):
 *    1. Validate uid + active session
 *    2. Snapshot exercises (immutable for the whole flow)
 *    3. Derive stats: totalVolume, totalSets, durationMinutes
 *    4. Evaluate PRs via Epley 1RM vs Firestore existing PRs
 *    5. Evaluate streak via evaluateStreak()
 *    6. Calculate XP: base 50 + 10 per PR
 *    7. Derive new level from XP
 *
 *  OPTIMISTIC UPDATE (before awaiting Firestore):
 *    - xpStore.awardXP(amount)   → local level/XP counters animate immediately
 *    - store setOptimisticDone() → session shows "complete" state in UI
 *
 *  ATOMIC BATCH (single writeBatch, 5 operation groups):
 *    1. SET   users/{uid}/sessions/{sessionId}
 *    2. SET   users/{uid}/sessions/{sessionId}/exercises/{id}  (× N)
 *    3. SET   users/{uid}/prs/{exerciseKey}                    (× PRs only)
 *    4. ADDOC users/{uid}/xpLog/{newId}                       (via batch.set with auto-id)
 *    5. UPDATE users/{uid}                                     (xp, level, streak, streakLastDate)
 *
 *  ON SUCCESS: resetSession() + return summary
 *  ON FAILURE:
 *    - Roll back optimistic XP (xpStore.rollbackXP)
 *    - Roll back optimistic done flag (store clearOptimisticDone)
 *    - Increment retryCount (exposed to UI for "save locally" UX at 3 failures)
 *    - Throw descriptive error (UI catches and shows retry button)
 *    - Session state is PRESERVED so the user can retry
 *
 * ─── getSessionStats() ────────────────────────────────────────────────────────
 *   Pure derived read — safe to call every render.
 */

import { useCallback, useRef } from 'react';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useSessionStore } from '../stores/sessionStore';
import { useXPStore } from '../stores/useXPStore';
import { useXPEngine, evaluateStreak, deriveLevelFromXP } from './useXPEngine';
import { isBodyweightExercise, getEstimated1RM } from '../stores/useWorkoutStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_SESSION_XP = 50;  // awarded for completing a session
const PR_XP           = 10;  // awarded per personal record broken

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkoutLogger() {
  const {
    isActive,
    startTime,
    moodTag,
    stomachFlag,
    exercises,
    resetSession,
  } = useSessionStore();

  const { awardXP: awardXPLocally, rollbackXP } = useXPStore();
  const { } = useXPEngine(); // ensure hook is initialised in this render tree

  // Persists a fully-built batch payload across retries (avoids re-calculating)
  const pendingBatchRef = useRef(null);
  // Counts how many times commit() has failed for this session
  const retryCountRef = useRef(0);

  // ── getSessionStats ─────────────────────────────────────────────────────────
  const getSessionStats = useCallback(() => {
    let totalSets   = 0;
    let totalVolume = 0;

    exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.done) {
          totalSets   += 1;
          totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
        }
      });
    });

    const durationMs      = startTime ? Date.now() - startTime.getTime() : 0;
    const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

    return {
      exerciseCount: exercises.length,
      totalSets,
      totalVolume,
      duration: durationMinutes,
    };
  }, [exercises, startTime]);

  // ── _buildBatchPayload ──────────────────────────────────────────────────────
  /**
   * Fetches the user profile + existing PRs, then pre-computes every value
   * that will go into the batch. Called once; result is cached in pendingBatchRef.
   *
   * @param {string} uid
   * @returns {Promise<BatchPayload>}
   */
  const _buildBatchPayload = useCallback(async (uid) => {
    // ── a. Snapshot state ──────────────────────────────────────────────────────
    const exercisesSnapshot = exercises;
    const sessionStartTime  = startTime;

    // ── b. Validate ────────────────────────────────────────────────────────────
    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
      throw new Error('[useWorkoutLogger] A valid UID is required.');
    }
    if (!isActive || !sessionStartTime) {
      throw new Error('[useWorkoutLogger] No active session to finish.');
    }

    // ── c. Fetch user profile + existing PRs ──────────────────────────────────
    const userRef   = doc(db, 'users', uid);
    const prsColRef = collection(db, 'users', uid, 'prs');

    const [userSnap, prsSnap] = await Promise.all([
      getDoc(userRef),
      getDocs(prsColRef),
    ]);

    if (!userSnap.exists()) throw new Error('[useWorkoutLogger] User profile not found.');

    const userData  = userSnap.data();
    const userBodyweight = parseFloat(userData.weightKg) || 70;

    const existingPRsMap = {};
    prsSnap.docs.forEach((d) => { existingPRsMap[d.id] = d.data(); });

    // ── d. Derive stats ────────────────────────────────────────────────────────
    let totalSets   = 0;
    let totalVolume = 0;

    exercisesSnapshot.forEach((ex) => {
      ex.sets.forEach((s) => {
        if (s.done) {
          totalSets   += 1;
          // BW sets: weight is 'BW' string — treat volume as 0 (bodyweight only)
          const w = s.weight === 'BW' ? 0 : (parseFloat(s.weight) || 0);
          totalVolume += w * (parseInt(s.reps, 10) || 0);
        }
      });
    });

    const durationMinutes = Math.max(1, Math.round((Date.now() - sessionStartTime.getTime()) / 60000));
    const sessionId       = crypto.randomUUID();
    const dateString      = new Date().toISOString().slice(0, 10);

    // ── e. Evaluate PRs ────────────────────────────────────────────────────────
    const newPRs = []; // { exerciseKey, exerciseId, name, weight, reps, bestSet1RM }

    const exerciseDocs = []; // Firestore sub-documents

    exercisesSnapshot.forEach((ex) => {
      const doneSets = ex.sets.filter((s) => s.done);
      if (doneSets.length === 0) return;

      // Build exercise sub-doc
      exerciseDocs.push({
        exerciseId:  ex.id,
        name:        ex.name,
        exerciseKey: ex.exerciseKey ?? ex.id,
        muscleGroup: ex.muscleGroup ?? '',
        sets: doneSets.map((s) => ({
          reps:   parseInt(s.reps, 10)  || 0,
          weight: s.weight === 'BW' ? 'BW' : (parseFloat(s.weight) || 0),
          done:   true,
        })),
        volume: doneSets.reduce(
          (sum, s) => sum + (s.weight === 'BW' ? 0 : (parseFloat(s.weight) || 0)) * (parseInt(s.reps, 10) || 0),
          0
        ),
      });

      // Find best set by Epley 1RM
      const isBW = isBodyweightExercise(ex.exerciseKey, ex.id);
      let best1RM   = -Infinity;
      let bestWeight = 0;
      let bestReps   = 0;

      doneSets.forEach((s) => {
        const w    = s.weight === 'BW' ? 0 : (parseFloat(s.weight) || 0);
        const r    = parseInt(s.reps, 10) || 0;
        const e1rm = getEstimated1RM(w, r, isBW, userBodyweight);
        if (e1rm > best1RM) { best1RM = e1rm; bestWeight = w; bestReps = r; }
      });

      // Compare against stored PR
      const exKey = ex.exerciseKey ?? ex.id;
      const stored = existingPRsMap[exKey];
      const stored1RM = stored
        ? getEstimated1RM(
            stored.weight === 'BW' ? 0 : (parseFloat(stored.weight) || 0),
            parseInt(stored.reps, 10) || 0,
            isBW,
            userBodyweight
          )
        : 0;

      if (best1RM > stored1RM) {
        newPRs.push({
          exerciseKey:  exKey,
          exerciseId:   ex.id,
          name:         ex.name,
          weight:       isBW && bestWeight === 0 ? 'BW' : bestWeight,
          reps:         bestReps,
          bestSet1RM:   best1RM,
        });
      }
    });

    if (exerciseDocs.length === 0) {
      throw new Error(
        '[useWorkoutLogger] Cannot save — no exercises have completed sets. ' +
        'Mark at least one set as done before finishing.'
      );
    }

    // ── f. Evaluate streak ────────────────────────────────────────────────────
    let lastDate = null;
    if (userData.streakLastDate) {
      lastDate = typeof userData.streakLastDate.toDate === 'function'
        ? userData.streakLastDate.toDate()
        : new Date(userData.streakLastDate);
    }
    const { newStreak } = evaluateStreak(lastDate, userData.streak ?? 0);

    // ── g. Calculate XP (deterministic, before batch) ─────────────────────────
    const currentXP  = typeof userData.xp === 'number' ? userData.xp : 0;
    const xpEarned   = BASE_SESSION_XP + newPRs.length * PR_XP;
    const newXP      = currentXP + xpEarned;
    const prevDerived = deriveLevelFromXP(currentXP);
    const newDerived  = deriveLevelFromXP(newXP);
    const levelUp     = newDerived.level > prevDerived.level;

    // ── h. Build the session document ─────────────────────────────────────────
    const sessionDoc = {
      date:            serverTimestamp(),
      dateString,
      moodTag:         moodTag ?? 'average',
      stomachFlag:     Boolean(stomachFlag),
      totalVolume,
      totalSets,
      durationMinutes,
      xpEarned,
      prCount:         newPRs.length,
    };

    return {
      uid,
      userRef,
      sessionId,
      sessionDoc,
      exerciseDocs,
      newPRs,
      xpEarned,
      newXP,
      newDerived,
      newStreak,
      levelUp,
      // Summary returned to caller
      summary: {
        sessionId,
        totalVolume,
        totalSets,
        durationMinutes,
        exerciseCount: exerciseDocs.length,
        prCount:       newPRs.length,
        prNames:       newPRs.map((p) => p.name),
        xpEarned,
        levelUp,
        newLevel:      newDerived.level,
        newLevelName:  newDerived.levelName,
      },
    };
  }, [isActive, startTime, exercises, moodTag, stomachFlag]);

  // ── _commitBatch ────────────────────────────────────────────────────────────
  /**
   * Takes a pre-built payload and commits the atomic Firestore batch.
   * Pure I/O — no local state touched here.
   */
  const _commitBatch = useCallback(async (payload) => {
    const {
      uid, userRef, sessionId, sessionDoc, exerciseDocs,
      newPRs, xpEarned, newXP, newDerived, newStreak,
    } = payload;

    const batch = writeBatch(db);

    // ── Op 1: Session document ─────────────────────────────────────────────────
    const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
    batch.set(sessionRef, sessionDoc);

    // ── Op 2: Exercise sub-documents ──────────────────────────────────────────
    exerciseDocs.forEach((ex) => {
      const exRef = doc(db, 'users', uid, 'sessions', sessionId, 'exercises', ex.exerciseId);
      batch.set(exRef, ex);
    });

    // ── Op 3: PR documents (conditional) ─────────────────────────────────────
    newPRs.forEach((pr) => {
      const prRef = doc(db, 'users', uid, 'prs', pr.exerciseKey);
      batch.set(prRef, {
        exerciseKey:  pr.exerciseKey,
        exerciseId:   pr.exerciseId,
        name:         pr.name,
        weight:       pr.weight,
        reps:         pr.reps,
        date:         serverTimestamp(),
      }, { merge: true });
    });

    // ── Op 4: XP log entry ────────────────────────────────────────────────────
    // writeBatch does not support addDoc; use a doc with random ID instead
    const xpLogRef = doc(collection(db, 'users', uid, 'xpLog'));
    batch.set(xpLogRef, {
      source:    'session_logged',
      amount:    xpEarned,
      sessionId,
      prCount:   newPRs.length,
      timestamp: serverTimestamp(),
    });

    // ── Op 5: User profile update ─────────────────────────────────────────────
    batch.update(userRef, {
      xp:             newXP,
      level:          newDerived.level,
      levelName:      newDerived.levelName,
      streak:         newStreak,
      streakLastDate: serverTimestamp(),
    });

    // Single commit — all 5 groups succeed or all roll back in Firestore
    await batch.commit();
  }, []);

  // ── finishSession ───────────────────────────────────────────────────────────
  /**
   * finishSession(uid)
   *
   * First call: builds payload + commits.
   * Subsequent calls (retries): re-uses cached payload, only re-commits.
   *
   * @param {string} uid
   * @returns {Promise<SessionSummary>}
   */
  const finishSession = useCallback(async (uid) => {
    try {
      // ── 1. Build payload (or reuse cached for retry) ───────────────────────
      let payload = pendingBatchRef.current;

      if (!payload) {
        payload = await _buildBatchPayload(uid);
        pendingBatchRef.current = payload;
      }

      // ── 2. Optimistic local update ─────────────────────────────────────────
      // Award XP locally so the counter animates immediately, before the
      // network round-trip. Rolled back if commit fails.
      awardXPLocally(payload.xpEarned);

      // ── 3. Commit atomic batch ─────────────────────────────────────────────
      await _commitBatch(payload);

      // ── 4. SUCCESS ─────────────────────────────────────────────────────────
      pendingBatchRef.current = null;
      retryCountRef.current   = 0;
      resetSession();

      return payload.summary;

    } catch (err) {
      // ── 5. FAILURE: roll back optimistic XP, preserve session ──────────────
      console.error('[useWorkoutLogger] finishSession failed:', err);

      // Reverse the local XP we speculatively added
      if (pendingBatchRef.current) {
        rollbackXP(pendingBatchRef.current.xpEarned);
      }

      retryCountRef.current += 1;

      // Session state is intentionally NOT reset — user can retry
      throw new Error(
        err?.message?.startsWith('[useWorkoutLogger]')
          ? err.message
          : `[useWorkoutLogger] Failed to save session. Your workout data is preserved — please try again. (${err?.message ?? 'network error'})`
      );
    }
  }, [_buildBatchPayload, _commitBatch, awardXPLocally, rollbackXP, resetSession]);

  return {
    // State passthrough
    isActive,
    startTime,
    moodTag,
    stomachFlag,
    exercises,

    // Retry state
    retryCount: retryCountRef.current,

    // Derived / async
    getSessionStats,
    finishSession,
    resetSession,
  };
}
