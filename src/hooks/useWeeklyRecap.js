import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../stores/useAuthStore';
import { useXPStore } from '../stores/useXPStore';

// Helper to calculate ISO week in YYYY-WNN format
function getISOWeek(date) {
  const tempDate = new Date(date.valueOf());
  // ISO week starts on Monday. Set to nearest Thursday: current date + 4 - current day number
  tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay() || 7));
  const yearStart = new Date(tempDate.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
  return `${tempDate.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns the Monday of the current ISO week (start of week boundary).
 * Fixes the old "last 7 days" cutoff which would include days from a different ISO week
 * and exclude days from the current week that are more than 7 days ago.
 */
function getISOWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diffToMonday = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useWeeklyRecap() {
  const { uid } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recap, setRecap] = useState(null);

  // Compute date values once in a stable ref — avoids re-renders at midnight resetting these
  const dateRef = useRef(null);
  if (!dateRef.current) {
    const today = new Date();
    dateRef.current = {
      today,
      weekId:      getISOWeek(today),
      isRecapDay:  today.getDay() === 0,    // Sunday = recap day
      weekStart:   getISOWeekStart(today),  // Monday 00:00:00 of current ISO week
    };
  }

  const { today, weekId, isRecapDay, weekStart } = dateRef.current;

  const [hasSeen, setHasSeen] = useState(() => {
    return localStorage.getItem(`recap_seen_${weekId}`) === 'true';
  });

  // Read streak from the hook at render time.
  // We store it in a ref so loadRecapData can read the latest value
  // WITHOUT being a useCallback dependency (which caused a re-fetch on every session save).
  const { streak } = useXPStore();
  const streakRef = useRef(streak);
  streakRef.current = streak;

  const loadRecapData = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // FIX: Use ISO week start (Monday 00:00) as cutoff instead of "7 days ago".
      // "7 days ago" would include sessions from last week and exclude early-week sessions.
      const sessionsRef = collection(db, 'users', uid, 'sessions');
      const q = query(
        sessionsRef,
        where('date', '>=', weekStart),
        orderBy('date', 'desc'),
        limit(7)
      );
      const sessSnap = await getDocs(q);

      let totalVolume = 0;
      let xpEarned = 0;
      const sessionsCount = sessSnap.size;

      // bestLift is stored directly on the session doc by useWorkoutLogger (bestLift field)
      let bestLiftObj = null;

      sessSnap.docs.forEach((docSnap) => {
        const sessionData = docSnap.data();
        totalVolume += sessionData.totalVolume || 0;
        xpEarned += sessionData.xpEarned || 0;

        // Prefer session-level bestLift summary; fall back gracefully if not present
        if (!bestLiftObj && sessionData.bestLift) {
          bestLiftObj = sessionData.bestLift;
        }
      });

      // Query PRs broken this week
      const prsRef = collection(db, 'users', uid, 'prs');
      const prQuery = query(prsRef, where('date', '>=', weekStart));
      const prSnap = await getDocs(prQuery);
      const prsBrokenCount = prSnap.size;

      // Motivational caption logic
      let motivationalLine = "No workouts logged. Let's make next week count! ⚡";
      if (sessionsCount === 1) {
        motivationalLine = "1 session logged. A small step is still progress! 🚀";
      } else if (sessionsCount === 2) {
        motivationalLine = "2 sessions logged. Nice work, keep building momentum! 🔥";
      } else if (sessionsCount === 3) {
        motivationalLine = "3 sessions logged. Consistent and strong! 🎯";
      } else if (sessionsCount >= 4) {
        motivationalLine = `${sessionsCount} sessions logged. Absolute machine! 🏆`;
      }

      setRecap({
        sessionsCount,
        totalVolume,
        prsBrokenCount,
        xpEarned,
        streak: streakRef.current ?? 0,
        bestLift: bestLiftObj,
        motivationalLine,
      });
    } catch (err) {
      console.error('[useWeeklyRecap] Error loading recap data:', err);
      setError(err.message || 'Failed to load weekly recap data.');
    } finally {
      setLoading(false);
    }
  }, [uid, weekStart]); // streak removed from deps — it was causing re-fetch on every session save

  useEffect(() => {
    loadRecapData();
  }, [loadRecapData]);

  const markAsSeen = useCallback(() => {
    localStorage.setItem(`recap_seen_${weekId}`, 'true');
    setHasSeen(true);
  }, [weekId]);

  return {
    loading,
    error,
    recap,
    isRecapDay,
    weekId,
    hasSeen,
    markAsSeen,
    refresh: loadRecapData,
  };
}
