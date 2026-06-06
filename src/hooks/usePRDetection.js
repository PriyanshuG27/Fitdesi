import { useCallback } from 'react';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { updatePR } from '../lib/firestoreUtils';

// Cache to store PR values for the session duration
const prCache = new Map();

/**
 * usePRDetection Hook
 * Called when a set is marked done. Checks if the weight/reps is a new PR for that exercise.
 * 
 * Returns checkForPR function:
 *   checkForPR(uid, exerciseKey, weight, reps) -> Promise<{ isPR: boolean, prevPR: object | null }>
 */
export function usePRDetection() {
  const checkForPR = useCallback(async (uid, exerciseKey, weight, reps) => {
    if (!uid || !exerciseKey) {
      return { isPR: false, prevPR: null };
    }

    // Normalize incoming values
    // 'BW' is treated as weight 0. Other strings are parsed as float.
    const newWeight = weight === 'BW' ? 0 : (parseFloat(weight) || 0);
    const newReps = parseInt(reps, 10) || 0;

    try {
      let existing = null;

      if (prCache.has(exerciseKey)) {
        // Read from cache if it exists
        existing = prCache.get(exerciseKey);
      } else {
        // First check for an exercise: read from Firestore
        const prRef = doc(db, 'users', uid, 'prs', exerciseKey);
        const prSnap = await getDoc(prRef);
        if (prSnap.exists()) {
          const data = prSnap.data();
          existing = {
            weight: data.weight === 'BW' ? 0 : (parseFloat(data.weight) || 0),
            reps: parseInt(data.reps, 10) || 0,
            originalData: data
          };
        }
        // Cache the result (can be null if it doesn't exist)
        prCache.set(exerciseKey, existing);
      }

      // If document doesn't exist: this IS a PR (first time ever)
      if (!existing) {
        // Update cache
        const prData = { weight: newWeight, reps: newReps };
        prCache.set(exerciseKey, prData);

        // Update database
        await updatePR(uid, exerciseKey, {
          weight: weight,
          reps: newReps,
          date: serverTimestamp(),
          previousWeight: 0
        });

        return { isPR: true, prevPR: null };
      }

      // PR logic: heavier is always a PR
      // If tie on weight: more reps is a PR
      const isNewPR =
        newWeight > existing.weight ||
        (newWeight === existing.weight && newReps > existing.reps);

      const prevPRData = existing.originalData || {
        weight: existing.weight === 0 && weight === 'BW' ? 'BW' : existing.weight,
        reps: existing.reps
      };

      if (isNewPR) {
        // Update cache
        const prData = { weight: newWeight, reps: newReps };
        prCache.set(exerciseKey, prData);

        // Update database
        await updatePR(uid, exerciseKey, {
          weight: weight,
          reps: newReps,
          date: serverTimestamp(),
          previousWeight: prevPRData.weight
        });

        return { isPR: true, prevPR: prevPRData };
      }

      return { isPR: false, prevPR: prevPRData };
    } catch (error) {
      console.error('[usePRDetection] Error in checkForPR:', error);
      // Safe fallback — never crash logging
      return { isPR: false, prevPR: null };
    }
  }, []);

  return { checkForPR };
}
