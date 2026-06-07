/**
 * useChallenges.js
 * Loads and manages challenge participation state.
 * Implements transaction-based progress tracking and duplicate checks.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { useUIStore } from '../stores/useUIStore';
import { useXPEngine } from './useXPEngine';

// Helper to compute progress percentage defined outside the hook to avoid circular dependency
function calculateProgressPct(challenge, uid) {
  if (!challenge || !challenge.progress || !challenge.progress[uid]) return 0;
  const progress = challenge.progress[uid];
  if (challenge.type === 'comeback') {
    const totalTarget = 3 * (challenge.goal?.durationWeeks || 12);
    const completed = progress.completedSessions || 0;
    return Math.min(100, Math.round((completed / totalTarget) * 100));
  } else if (challenge.type === 'streak') {
    const workoutsPerWeek = challenge.goal?.workoutsPerWeek || 3;
    const durationWeeks = challenge.goal?.durationWeeks || 8;
    const totalTarget = workoutsPerWeek * durationWeeks;
    const sum = (progress.weeklyCount || []).reduce((acc, v) => acc + v, 0);
    return Math.min(100, Math.round((sum / totalTarget) * 100));
  }
  return 0;
}

export function useChallenges() {
  const { user } = useAuthStore();
  const { awardXP } = useXPEngine();
  const { addToast } = useUIStore();

  const [challenges, setChallenges] = useState([]);
  const [userProgress, setUserProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to compute progress percentage for component consumption
  const getProgressPercent = useCallback((challengeOrId, uid) => {
    let challenge = challengeOrId;
    if (typeof challengeOrId === 'string') {
      challenge = challenges.find((c) => c.id === challengeOrId);
    }
    return calculateProgressPct(challenge, uid);
  }, [challenges]);

  // Load challenges from Firestore
  const loadChallenges = useCallback(async (uid) => {
    if (!uid) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'challenges'),
        where('participants', 'array-contains', uid)
      );
      const snap = await getDocs(q);
      const userChallenges = [];
      const progressMap = {};

      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const id = docSnap.id;

        const start = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate || Date.now());
        const durationDays = data.type === 'comeback' ? 84 : 56;
        const end = data.endDate?.toDate ? data.endDate.toDate() : new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const diffMs = end.getTime() - Date.now();
        const weeksRemaining = Math.max(0, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));

        const progressPercent = calculateProgressPct({ ...data, id }, uid);

        let currentMission = '';
        const userProg = data.progress?.[uid] || {};
        if (data.type === 'comeback') {
          currentMission = `Week ${userProg.currentWeek || 1}: Complete 3 workouts (Total: ${userProg.completedSessions || 0}/36)`;
        } else if (data.type === 'streak') {
          const currentWeek = userProg.currentWeek || 1;
          const weekCount = userProg.weeklyCount?.[currentWeek - 1] || 0;
          currentMission = `Week ${currentWeek}: Log 3 workouts (Week count: ${weekCount}/3)`;
        }

        const mappedChallenge = {
          id,
          ...data,
          name: data.type === 'comeback' ? 'Comeback Challenge' : 'Streak Challenge',
          description: data.type === 'comeback'
            ? 'Train 3x/week for 12 weeks to build your base'
            : 'Train 3x/week for 8 weeks consecutively',
          durationDays,
          weeksRemaining,
          progressPct: progressPercent,
          currentMission,
        };

        userChallenges.push(mappedChallenge);

        const diffDays = Math.floor((Date.now() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
        const currentDay = Math.min(durationDays, Math.max(1, diffDays));
        progressMap[id] = {
          joinedAt: start,
          currentDay,
          completed: data.status === 'completed',
          currentWeek: userProg.currentWeek || 1,
        };
      });

      const templates = [];
      const joinedTypes = userChallenges.map((c) => c.type);
      if (!joinedTypes.includes('comeback')) {
        templates.push({
          id: 'comeback',
          type: 'comeback',
          name: 'Comeback Challenge',
          description: 'Train 3x/week for 12 weeks to build your base',
          durationDays: 84,
        });
      }
      if (!joinedTypes.includes('streak')) {
        templates.push({
          id: 'streak',
          type: 'streak',
          name: 'Streak Challenge',
          description: 'Train 3x/week for 8 weeks consecutively',
          durationDays: 56,
        });
      }

      setChallenges([...userChallenges, ...templates]);
      setUserProgress(progressMap);
    } catch (err) {
      console.error('Error loading challenges:', err);
      setError('Failed to load challenges.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.uid) {
      loadChallenges(user.uid);
    } else {
      setChallenges([]);
      setUserProgress({});
    }
  }, [user?.uid, loadChallenges]);

  // startChallenge(uid, type)
  const startChallenge = useCallback(async (uid, type) => {
    if (!uid || !type) throw new Error('UID and Type are required.');
    if (type !== 'comeback' && type !== 'streak') {
      throw new Error('Invalid challenge type.');
    }

    const q = query(
      collection(db, 'challenges'),
      where('type', '==', type),
      where('participants', 'array-contains', uid),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      throw new Error('You already have an active challenge of this type');
    }

    const docRef = doc(collection(db, 'challenges'));
    const challengeId = docRef.id;

    const challengeDoc = {
      type,
      creatorUid: uid,
      participants: [uid],
      startDate: serverTimestamp(),
      status: 'active',
    };

    if (type === 'comeback') {
      challengeDoc.endDate = new Date(Date.now() + 84 * 24 * 60 * 60 * 1000);
      challengeDoc.goal = { durationWeeks: 12, startCapacityPct: 40 };
      challengeDoc.progress = {
        [uid]: { currentWeek: 1, completedSessions: 0, badgeEarned: false }
      };
    } else {
      challengeDoc.endDate = new Date(Date.now() + 56 * 24 * 60 * 60 * 1000);
      challengeDoc.goal = { workoutsPerWeek: 3, durationWeeks: 8 };
      challengeDoc.progress = {
        [uid]: { currentWeek: 1, weeklyCount: [0, 0, 0, 0, 0, 0, 0, 0], badgeEarned: false }
      };
    }

    await setDoc(docRef, challengeDoc);
    await loadChallenges(uid);

    return challengeId;
  }, [loadChallenges]);

  // getActiveChallenges(uid)
  const getActiveChallenges = useCallback(async (userUid) => {
    if (!userUid) return [];
    const q = query(
      collection(db, 'challenges'),
      where('participants', 'array-contains', userUid),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id;

      const start = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate || Date.now());
      const durationDays = data.type === 'comeback' ? 84 : 56;
      const end = data.endDate?.toDate ? data.endDate.toDate() : new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const diffMs = end.getTime() - Date.now();
      const weeksRemaining = Math.max(0, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));

      let progressPct = 0;
      const progress = data.progress?.[userUid];
      if (progress) {
        if (data.type === 'comeback') {
          const totalTarget = 3 * (data.goal?.durationWeeks || 12);
          const completed = progress.completedSessions || 0;
          progressPct = Math.min(100, Math.round((completed / totalTarget) * 100));
        } else if (data.type === 'streak') {
          const workoutsPerWeek = data.goal?.workoutsPerWeek || 3;
          const durationWeeks = data.goal?.durationWeeks || 8;
          const totalTarget = workoutsPerWeek * durationWeeks;
          const sum = (progress.weeklyCount || []).reduce((acc, v) => acc + v, 0);
          progressPct = Math.min(100, Math.round((sum / totalTarget) * 100));
        }
      }

      let currentMission = '';
      const userProg = data.progress?.[userUid] || {};
      if (data.type === 'comeback') {
        currentMission = `Week ${userProg.currentWeek || 1}: Complete 3 workouts (Total: ${userProg.completedSessions || 0}/36)`;
      } else if (data.type === 'streak') {
        const currentWeek = userProg.currentWeek || 1;
        const weekCount = userProg.weeklyCount?.[currentWeek - 1] || 0;
        currentMission = `Week ${currentWeek}: Log 3 workouts (Week count: ${weekCount}/3)`;
      }

      return {
        id,
        ...data,
        name: data.type === 'comeback' ? 'Comeback Challenge' : 'Streak Challenge',
        description: data.type === 'comeback'
          ? 'Train 3x/week for 12 weeks to build your base'
          : 'Train 3x/week for 8 weeks consecutively',
        durationDays,
        weeksRemaining,
        progressPct,
        currentMission,
      };
    });
  }, []);

  // updateProgress(uid, challengeId, sessionDate)
  const updateProgress = useCallback(async (uid, challengeId, sessionDate) => {
    if (!uid || !challengeId || !sessionDate) {
      throw new Error('Missing required arguments for progress update');
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(challengeId)) {
      throw new Error('Invalid challenge ID format');
    }

    const challengeRef = doc(db, 'challenges', challengeId);
    let shouldAwardXP = false;

    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(challengeRef);
      if (!docSnap.exists()) {
        throw new Error('Challenge document does not exist');
      }

      const data = docSnap.data();
      if (data.status !== 'active') {
        throw new Error('Challenge is not active');
      }

      const start = data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate);
      const session = sessionDate instanceof Date ? sessionDate : new Date(sessionDate);
      const diffTime = session.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
      const durationWeeks = data.goal?.durationWeeks || (data.type === 'comeback' ? 12 : 8);
      const currentWeek = Math.min(durationWeeks, Math.max(1, Math.floor(diffDays / 7) + 1));

      const userProg = { ...(data.progress?.[uid] || {}) };

      if (data.type === 'comeback') {
        userProg.completedSessions = (userProg.completedSessions || 0) + 1;
        userProg.currentWeek = currentWeek;
      } else if (data.type === 'streak') {
        const weeklyCount = [...(userProg.weeklyCount || [0, 0, 0, 0, 0, 0, 0, 0])];
        weeklyCount[currentWeek - 1] = (weeklyCount[currentWeek - 1] || 0) + 1;
        userProg.weeklyCount = weeklyCount;
        userProg.currentWeek = currentWeek;
      }

      let isComplete = false;
      if (data.type === 'comeback') {
        isComplete = userProg.completedSessions >= 3 * durationWeeks;
      } else if (data.type === 'streak') {
        isComplete = userProg.weeklyCount.every((count) => count >= 3);
      }

      const updates = {
        [`progress.${uid}`]: userProg,
      };

      if (isComplete) {
        updates.status = 'completed';
        userProg.badgeEarned = true;
        if (!data.progress?.[uid]?.badgeEarned) {
          shouldAwardXP = true;
        }
      }

      transaction.update(challengeRef, updates);
    });

    if (shouldAwardXP) {
      await awardXP(uid, 'challenge_complete', 500, { challengeId });
    }

    await loadChallenges(uid);
  }, [awardXP, loadChallenges]);

  // joinChallenge(challengeId) - backward compatibility wrapper
  const joinChallenge = useCallback(async (challengeId) => {
    if (!user?.uid) return;
    const type = challengeId === 'comeback' || challengeId === 'comeback_template' ? 'comeback' : 'streak';
    try {
      await startChallenge(user.uid, type);
      addToast('Challenge joined successfully! 🔥', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to join challenge.', 'error');
    }
  }, [user?.uid, startChallenge, addToast]);

  return {
    challenges,
    userProgress,
    loading,
    error,
    startChallenge,
    getActiveChallenges,
    updateProgress,
    getProgressPercent,
    joinChallenge,
  };
}
