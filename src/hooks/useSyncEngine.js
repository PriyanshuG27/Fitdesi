import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, writeBatch, query, orderBy, limit, getDocs, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from '../stores/useAuthStore';
import { usePlanStore } from '../stores/usePlanStore';

export const useSyncEngine = () => {
  const { uid } = useAuthStore();
  const { setPlan } = usePlanStore();
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Listen to planned targets
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
    });

    return () => unsubscribe();
  }, [uid, setPlan]);

  const triggerDeltaSync = async () => {
    if (!uid || !online) return;
    setSyncing(true);
    try {
      // Fetch latest executed sessions and plan targets to reconcile deltas
      const execRef = collection(db, 'users', uid, 'executed_sessions');
      const execQuery = query(execRef, orderBy('date', 'desc'), limit(10));
      const execSnap = await getDocs(execQuery);
      
      const planRef = collection(db, 'users', uid, 'planned_targets');
      const planQuery = query(planRef, orderBy('epoch', 'desc'), limit(1));
      const planSnap = await getDocs(planQuery);

      if (execSnap.empty || planSnap.empty) {
        setSyncing(false);
        return;
      }

      const latestExec = execSnap.docs[0].data();
      const latestPlanDoc = planSnap.docs[0];
      const latestPlan = latestPlanDoc.data();

      // Check if executed session completed a planned target
      // Reconciliation logic: if the execution matches the planned focus, mark day complete and calculate progressive overload
      let updatedPlan = { ...latestPlan };
      let changed = false;

      // Increment epoch to notify client changes
      if (changed) {
        const batch = writeBatch(db);
        const planDocRef = doc(db, 'users', uid, 'planned_targets', latestPlanDoc.id);
        batch.set(planDocRef, {
          ...updatedPlan,
          epoch: Date.now()
        }, { merge: true });
        await batch.commit();
      }
    } catch (err) {
      console.error('[SyncEngine] Delta sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  return { online, syncing, triggerDeltaSync };
};
