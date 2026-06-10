import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from '../stores/useAuthStore';
import { usePlanStore } from '../stores/usePlanStore';

/**
 * useSyncEngine.js
 *
 * Provides:
 *   - online/offline status detection
 *   - Real-time listener for planned_targets (syncs latest plan to store)
 *
 * NOTE: The old `triggerDeltaSync` function was removed. It fetched 10 executed_sessions
 * and 1 planned_target doc from Firestore, then did NOTHING with them (the reconciliation
 * block had `changed = false` hardcoded, so the batch write never ran). This was 11 reads
 * per call with zero benefit. Removed to save Firestore quota.
 *
 * If session→plan reconciliation (progressive overload tracking) is implemented in the
 * future, it should live in a Cloud Function, not in the client.
 */
export const useSyncEngine = () => {
  const { uid } = useAuthStore();
  const { setPlan } = usePlanStore();
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Track online/offline state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const goOnline  = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Real-time listener for planned_targets — syncs the latest plan into the store.
  // Uses onSnapshot so the plan automatically updates when the Cloud Function writes a new one.
  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, 'users', uid, 'planned_targets'),
      orderBy('epoch', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestPlan = snapshot.docs[0].data();
        setPlan({ id: snapshot.docs[0].id, ...latestPlan });
      }
    }, (err) => {
      console.error('[SyncEngine] planned_targets listener error:', err);
    });

    return () => unsubscribe();
  }, [uid, setPlan]);

  return { online };
};
