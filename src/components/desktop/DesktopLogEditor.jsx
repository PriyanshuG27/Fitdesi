import React, { useState, useEffect } from 'react';
import { Sparkles, Save, CheckCircle, Activity, Brain } from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, writeBatch } from 'firebase/firestore';
import { useAuthStore } from '../../stores/useAuthStore';

export const DesktopLogEditor = () => {
  const { uid } = useAuthStore();
  const [session, setSession] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [rpe, setRpe] = useState(7);
  const [mmc, setMmc] = useState(7);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const fetchLatestSession = async () => {
      let latestMobile = null;
      try {
        const sessionsRef = collection(db, 'users', uid, 'sessions');
        const qMobile = query(sessionsRef, orderBy('date', 'desc'), limit(1));
        const snapMobile = await getDocs(qMobile);
        if (!snapMobile.empty) {
          const sessDoc = snapMobile.docs[0];
          const sessData = sessDoc.data();
          const exSnap = await getDocs(collection(db, 'users', uid, 'sessions', sessDoc.id, 'exercises'));
          const exercises = exSnap.docs.map(exDoc => ({ id: exDoc.id, ...exDoc.data() }));

          const rawDate = sessData.date;
          let resolvedDate = new Date();
          if (rawDate) {
            if (rawDate.toDate) resolvedDate = rawDate.toDate();
            else if (rawDate.seconds) resolvedDate = new Date(rawDate.seconds * 1000);
            else resolvedDate = new Date(rawDate);
          }

          latestMobile = {
            id: sessDoc.id,
            source: 'mobile',
            ...sessData,
            date: resolvedDate,
            exercises
          };
        }
      } catch (err) {
        console.error('[LogEditor] Error fetching mobile session:', err);
      }

      let latestDesktop = null;
      try {
        const execRef = collection(db, 'users', uid, 'executed_sessions');
        const qDesktop = query(execRef, orderBy('date', 'desc'), limit(1));
        const snapDesktop = await getDocs(qDesktop);
        if (!snapDesktop.empty) {
          const sessDoc = snapDesktop.docs[0];
          const sessData = sessDoc.data();

          const rawDate = sessData.date;
          let resolvedDate = new Date();
          if (rawDate) {
            if (rawDate.toDate) resolvedDate = rawDate.toDate();
            else if (rawDate.seconds) resolvedDate = new Date(rawDate.seconds * 1000);
            else resolvedDate = new Date(rawDate);
          }

          latestDesktop = {
            id: sessDoc.id,
            source: 'desktop',
            ...sessData,
            date: resolvedDate,
            exercises: sessData.exercises || []
          };
        }
      } catch (err) {
        console.error('[LogEditor] Error fetching desktop session:', err);
      }

      let latest = null;
      if (latestMobile && latestDesktop) {
        latest = latestMobile.date > latestDesktop.date ? latestMobile : latestDesktop;
      } else {
        latest = latestMobile || latestDesktop;
      }

      if (latest) {
        setSession(latest);
        setExercises(latest.exercises || []);
        setRpe(latest.rpeScore || 7);
        setMmc(latest.mmcScore || 7);
        setNotes(latest.notes || '');
      }
    };
    fetchLatestSession();
  }, [uid]);

  const handleUpdateExerciseLog = (exIndex, setIndex, field, value) => {
    const updated = [...exercises];
    updated[exIndex].sets[setIndex][field] = parseFloat(value) || value;
    setExercises(updated);
  };

  const handleUpdateCues = (exIndex, value) => {
    const updated = [...exercises];
    updated[exIndex].verbalCues = value.split(',').map(c => c.trim()).filter(Boolean);
    setExercises(updated);
  };

  const handleSaveLogs = async () => {
    if (!uid || !session) return;
    setSaving(true);
    setSuccess(false);

    try {
      const batch = writeBatch(db);

      if (session.source === 'mobile') {
        const sessRef = doc(db, 'users', uid, 'sessions', session.id);
        batch.set(sessRef, {
          rpeScore: rpe,
          mmcScore: mmc,
          notes,
          editedAt: new Date()
        }, { merge: true });

        exercises.forEach((ex) => {
          const exId = ex.id || ex.exerciseId || ex.exerciseKey;
          if (exId) {
            const exRef = doc(db, 'users', uid, 'sessions', session.id, 'exercises', exId);
            batch.set(exRef, {
              sets: ex.sets || [],
              verbalCues: ex.verbalCues || []
            }, { merge: true });
          }
        });
      } else {
        const sessRef = doc(db, 'users', uid, 'executed_sessions', session.id);
        batch.set(sessRef, {
          exercises,
          rpeScore: rpe,
          mmcScore: mmc,
          notes,
          editedAt: new Date()
        }, { merge: true });
      }

      await batch.commit();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      console.error('[LogEditor] Failed to save session edits:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] text-center font-mono text-xs text-[var(--text-secondary)]">
        No recent executed workouts found to review.
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-3 flex justify-between items-center">
        <div>
          <h3 className="font-display font-black text-xl text-white uppercase tracking-tight flex items-center gap-2">
            <Activity className="text-[var(--primary)]" size={20} />
            <span>Post-Workout Recap Cinema</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Review telemetry logs, edit values, and configure Desk Vault cues.
          </p>
        </div>
        <button
          onClick={handleSaveLogs}
          disabled={saving}
          className="flex items-center gap-2 border-2 border-black bg-[var(--primary)] px-4 py-2 rounded-lg shadow-[3px_3px_0px_black] text-xs font-mono font-bold text-white uppercase hover:brightness-110 active:scale-95 transition-all disabled:opacity-40"
        >
          {success ? <CheckCircle size={14} /> : <Save size={14} />}
          <span>{saving ? 'Saving...' : success ? 'Saved!' : 'Save Logs'}</span>
        </button>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RPE Slider */}
        <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-4 rounded-xl flex flex-col gap-2 shadow-[2px_2px_0px_black]">
          <div className="flex justify-between items-center font-mono text-xs uppercase font-bold">
            <span className="text-[var(--text-secondary)]">Exertion Index (RPE)</span>
            <span className="text-[var(--primary)] text-sm">{rpe}/10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={rpe}
            onChange={(e) => setRpe(parseInt(e.target.value))}
            className="w-full accent-[var(--primary)]"
          />
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-sans mt-1">
            RPE measures structural exhaustion. 10 is failure, 7 is 3 reps left.
          </p>
        </div>

        {/* MMC Slider */}
        <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-4 rounded-xl flex flex-col gap-2 shadow-[2px_2px_0px_black]">
          <div className="flex justify-between items-center font-mono text-xs uppercase font-bold">
            <span className="text-[var(--text-secondary)]">Mind-Muscle Connection</span>
            <span className="text-[var(--secondary)] text-sm">{mmc}/10</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            value={mmc}
            onChange={(e) => setMmc(parseInt(e.target.value))}
            className="w-full accent-[var(--secondary)]"
          />
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-sans mt-1">
            MMC measures cognitive motor recruiting. Higher value signals optimal form.
          </p>
        </div>
      </div>

      {/* Log Details */}
      <div className="flex flex-col gap-4">
        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
          Exercise Table
        </span>
        
        <div className="flex flex-col gap-3">
          {exercises.map((ex, exIndex) => (
            <div key={exIndex} className="border border-[var(--border)] bg-[var(--bg-elevated)] p-4 rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono font-black uppercase text-white">
                  {ex.name}
                </span>
                <div className="flex items-center gap-1 text-[10px] font-mono text-[var(--text-secondary)]">
                  <Brain size={12} className="text-[var(--primary)]" />
                  <span>Desk Cues</span>
                </div>
              </div>

              {/* Set Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {ex.sets?.map((set, setIndex) => (
                  <div key={setIndex} className="border border-black bg-black/40 p-2 rounded-lg flex items-center justify-between text-xs font-mono">
                    <span className="text-[var(--text-secondary)]">Set {setIndex + 1}</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={set.weight}
                        onChange={(e) => handleUpdateExerciseLog(exIndex, setIndex, 'weight', e.target.value)}
                        className="w-12 bg-black border border-[#333] text-center text-white py-0.5 rounded focus:outline-none focus:border-[var(--primary)]"
                      />
                      <span className="text-[#555]">kg</span>
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) => handleUpdateExerciseLog(exIndex, setIndex, 'reps', e.target.value)}
                        className="w-10 bg-black border border-[#333] text-center text-white py-0.5 rounded focus:outline-none focus:border-[var(--primary)]"
                      />
                      <span className="text-[#555]">reps</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mind-Muscle Cues Vault */}
              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-mono text-[var(--text-secondary)] uppercase">
                  Mobile Trigger Cues (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Break at hips, Chest tall"
                  value={ex.verbalCues?.join(', ') || ''}
                  onChange={(e) => handleUpdateCues(exIndex, e.target.value)}
                  className="w-full bg-black border border-[#222] px-3 py-1.5 rounded text-xs text-white focus:outline-none focus:border-[var(--primary)]"
                />
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
