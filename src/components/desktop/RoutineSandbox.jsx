import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Play, Code, LayoutGrid, RotateCcw, Search, Dumbbell, Check, Calendar, Plus, Trash2, Save, ChevronDown, CheckCircle, HelpCircle } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuthStore } from '../../stores/useAuthStore';
import { usePRList } from '../../hooks/useProgress';
import { motion, AnimatePresence } from 'framer-motion';
import exerciseData from '../../data/exercises.json';

export const RoutineSandbox = () => {
  const { uid } = useAuthStore();
  const { prs } = usePRList(uid);
  const [activeTab, setActiveTab] = useState('tree'); // 'tree' | 'racing' | 'scheduler'

  // Exercise Selector state
  const [selectedExercise, setSelectedExercise] = useState('Barbell Bench Press');
  const [selectedExerciseKey, setSelectedExerciseKey] = useState('barbell_bench_press');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Recursion Tree Simulation state
  const [stepPath, setStepPath] = useState('step1'); // 'step1' | 'success' | 'failure' | 'failure_minor' | 'failure_codered' | 'diagnosed_bottom' | 'diagnosed_mid' | 'diagnosed_top'
  const [examDeloadActive, setExamDeloadActive] = useState(false);

  // Periodization Racing state
  const [racing, setRacing] = useState(false);
  const [simResults, setSimResults] = useState(null);

  // Workout Scheduler state
  const [schedulerSuccess, setSchedulerSuccess] = useState(false);
  const [savingScheduler, setSavingScheduler] = useState(false);
  const [schedule, setSchedule] = useState({
    Monday: { focus: 'Push Day', notes: 'Heavy chest focus' },
    Tuesday: { focus: 'Pull Day', notes: 'Lats & biceps' },
    Wednesday: { focus: 'Rest Day', notes: 'Active recovery walk' },
    Thursday: { focus: 'Legs Day', notes: 'Squats overload' },
    Friday: { focus: 'Rest Day', notes: 'Stretching & mobility' },
    Saturday: { focus: 'Upper Body', notes: 'Hypertrophy pumps' },
    Sunday: { focus: 'Rest Day', notes: 'Full recovery' }
  });

  // Dynamic sticking points and accessory configurations based on lift key, type, or muscle group
  const autopsyConfig = useMemo(() => {
    const key = selectedExerciseKey.toLowerCase();
    const exercise = exerciseData.find(e => e.key === selectedExerciseKey) || {};
    const muscleGroup = (exercise.muscleGroup || '').toLowerCase();
    
    // 1. Deadlifts and conventional pulls
    if (key.includes('deadlift') || key.includes('clean') || key.includes('snatch')) {
      return {
        bottomText: 'A) Off the Floor / Bottom (Hamstring pull initiation weakness)',
        midText: 'B) At Knee Level / Transition (Shin-to-thigh quad lag / bar drift)',
        topText: 'C) Lockout (Glute lockout / grip strength failure)',
        bottomReport: {
          weakness: 'Floor drive and posterior chain pull initiation.',
          fixes: 'Deficit Deadlifts (3x4 reps standing on 2-inch block) and Halting Deadlifts (3x5 reps).'
        },
        midReport: {
          weakness: 'Knee-height drive and bar path control.',
          fixes: 'Block Pulls / Rack Pulls below knees (3x5 reps) and Snatch-Grip Deadlifts (3x6).'
        },
        topReport: {
          weakness: 'Glute lockout, shoulder retraction, and grip stability.',
          fixes: 'Heavy Rack Pulls at mid-thigh (3x4 reps) and Farmer\'s Walks (3 sets of 40 meters).'
        }
      };
    }
    
    // 2. Squats, Leg Presses, Lunges, and generic Legs / Lower Body
    if (
      muscleGroup === 'legs' ||
      key.includes('squat') || 
      key.includes('leg_press') || 
      key.includes('lunge') ||
      key.includes('calf') ||
      key.includes('extension') ||
      key.includes('curl')
    ) {
      return {
        bottomText: 'A) Bottom of the Hole / Deep Stretch (Hip/Quad acceleration weakness)',
        midText: 'B) Midway / Sticking Point (Quad rollover lag / knee extension failure)',
        topText: 'C) Stand up / Lockout (Glute lockout / hip extension fatigue)',
        bottomReport: {
          weakness: 'Bottom-range acceleration and quad drive initiation.',
          fixes: 'Pause Squats (3x4 reps with 3-second hold) and Leg Presses (3x10 reps).'
        },
        midReport: {
          weakness: 'Mid-range quad drive and torso stability.',
          fixes: 'Front Squats (3x6 reps) and Pin Squats (3x4 reps at sticking height).'
        },
        topReport: {
          weakness: 'Glute activation and hip extension lockout.',
          fixes: 'Romanian Deadlifts (3x8 reps) and Barbell Hip Thrusts (3x10 reps).'
        }
      };
    }
    
    // 3. Rows, Pulldowns, Pull-ups, Chin-ups, and Back / Upper Pulls
    if (
      muscleGroup === 'back' ||
      key.includes('row') || 
      key.includes('pulldown') || 
      key.includes('pull_up') || 
      key.includes('chin_up') || 
      key.includes('lats')
    ) {
      return {
        bottomText: 'A) Start of Pull / Fully Stretched (Scapular initiation weakness)',
        midText: 'B) Mid-Pull / Elbow Drive (Lat squeeze and upper back engagement lag)',
        topText: 'C) Peak Contraction / At Chest or Chin (Bicep or grip exhaustion)',
        bottomReport: {
          weakness: 'Scapular depression and initial lat activation.',
          fixes: 'Scapular Pull-ups (3x10 reps) and Straight-Arm Lat Pulldowns (3x12 reps).'
        },
        midReport: {
          weakness: 'Elbow drive and rhomboids/lower-trap squeeze.',
          fixes: 'Chest-Supported Row (3x8 reps) and Face Pulls (3x15 reps).'
        },
        topReport: {
          weakness: 'Peak contraction squeeze and bicep/grip endurance.',
          fixes: 'Underhand Chin-ups (3xMax reps) and Hammer Curls (3x10 reps).'
        }
      };
    }
    
    // 4. Overhead Press, Shoulder Press, Lateral Raises, and Shoulders / Delts
    if (
      muscleGroup === 'shoulders' ||
      key.includes('overhead_press') || 
      key.includes('shoulder_press') || 
      key.includes('military_press') ||
      key.includes('lateral_raise') ||
      key.includes('delt')
    ) {
      return {
        bottomText: 'A) Off the Collarbone / Bottom (Front delt drive initiation weakness)',
        midText: 'B) At Eye/Forehead Level (Tricep shoulder transition lag)',
        topText: 'C) Lockout / Overhead (Trap stability / tricep lockout failure)',
        bottomReport: {
          weakness: 'Collarbone-to-chin drive and front shoulder acceleration.',
          fixes: 'Pin Press starting at nose level (3x5 reps) and Z-Presses seated on floor (3x8).'
        },
        midReport: {
          weakness: 'Forehead height push and lateral/front delt engagement.',
          fixes: 'Dumbbell Shoulder Presses (3x8 reps) and Lateral Raises (3x12 reps).'
        },
        topReport: {
          weakness: 'Lockout extension and upper back stability overhead.',
          fixes: 'Overhead Carries / Kettlebell Waiter\'s Walks (3x30 meters) and Heavy Triceps Pushdowns (3x10 reps).'
        }
      };
    }

    // 5. Curls, Pushdowns, Extensions, and Arms / Biceps / Triceps
    if (
      muscleGroup === 'arms' ||
      key.includes('curl') || 
      key.includes('pushdown') || 
      key.includes('bicep') || 
      key.includes('tricep') ||
      key.includes('dip')
    ) {
      return {
        bottomText: 'A) Start of Contraction / Fully Extended (Initial muscle recruitment lag)',
        midText: 'B) Mid-range / 90-Degree Angle (Peak torque sticking point)',
        topText: 'C) Peak Squeeze / Full Flexion (Bicep/Tricep contraction fatigue)',
        bottomReport: {
          weakness: 'Initial contraction strength and joint tendon conditioning.',
          fixes: 'Incline Dumbbell Curls (3x10 reps) or Overhead Cable Triceps Extensions (3x12 reps).'
        },
        midReport: {
          weakness: 'Mid-range torque generation and forearm stabilization.',
          fixes: 'Hammer Curls (3x10 reps) or Heavy Triceps Pushdowns (3x10 reps).'
        },
        topReport: {
          weakness: 'Peak contraction squeeze and mind-muscle connection.',
          fixes: 'Concentration Curls (3x12 reps) or Bench Dips (3xMax reps).'
        }
      };
    }

    // 6. Crunches, Planks, Situps, Leg Raises, and Core / Abs
    if (
      muscleGroup === 'core' ||
      key.includes('crunch') || 
      key.includes('plank') || 
      key.includes('situp') || 
      key.includes('abs') || 
      key.includes('leg_raise')
    ) {
      return {
        bottomText: 'A) Start of Flexion / Flat Position (Rectus abdominis initiation failure)',
        midText: 'B) Halfway Flexed / Isometric Hold (Oblique and transverse abdominis stability lag)',
        topText: 'C) Full Contraction / Max Compression (Hip flexor dominance / abdominal fatigue)',
        bottomReport: {
          weakness: 'Lower abdominal recruitment and spinal flexion initiation.',
          fixes: 'Hanging Leg Raises (3x10 reps) and Reverse Crunches (3x15 reps).'
        },
        midReport: {
          weakness: 'Core stability and isometric endurance under load.',
          fixes: 'Weighted Planks (3 sets of 45 seconds) and Ab Wheel Rollouts (3x8 reps).'
        },
        topReport: {
          weakness: 'Upper abdominal compression and breathing control.',
          fixes: 'Cable Crunches (3x12 reps) and Decline Weighted Sit-ups (3x12 reps).'
        }
      };
    }

    // 7. Stretching, Mobility, and General Default
    if (muscleGroup === 'stretching') {
      return {
        bottomText: 'A) Start of Stretch / Tightness (Initial mobility barrier)',
        midText: 'B) Mid-range / Active Tension (Connective tissue resistance)',
        topText: 'C) Full Range / End Position (Stretch tolerance / joint stiffness)',
        bottomReport: {
          weakness: 'Muscle spindle sensitivity and deep tightness.',
          fixes: 'Foam Rolling (5 mins) and Dynamic Stretching before sets.'
        },
        midReport: {
          weakness: 'Active mobility range and eccentric control.',
          fixes: 'PNF Stretching and slow eccentric calisthenics.'
        },
        topReport: {
          weakness: 'End-range active strength and joint stability.',
          fixes: 'Yoga Flow (10 mins) and active isometric holds.'
        }
      };
    }

    // Default (Chest / Bench Press family / default)
    return {
      bottomText: 'A) Off the Chest / Bottom (Acceleration Weakness)',
      midText: 'B) Mid-way / Transition (Shoulder/tricep transition lag)',
      topText: 'C) Near Lockout / Top (Triceps extension weakness)',
      bottomReport: {
        weakness: 'Bottom-range acceleration and chest drive.',
        fixes: 'Incline Dumbbell Presses (3x8 reps) and Deficit Push-ups (3xMax reps).'
      },
      midReport: {
        weakness: 'Shoulder transition drive and sticking point control.',
        fixes: 'Spoto Presses (3x5 reps with 1-sec pause off chest) and Board Presses (3x6 reps).'
      },
      topReport: {
        weakness: 'Triceps lockout extension.',
        fixes: 'Pin Presses at lockout height (3x4 reps) and Heavy Triceps Pushdowns (3x8 reps).'
      }
    };
  }, [selectedExerciseKey]);

  // Fast-lookup map of user's personal records
  const prsMap = useMemo(() => {
    const map = {};
    if (prs && Array.isArray(prs)) {
      prs.forEach(p => {
        if (p.exerciseKey) {
          map[p.exerciseKey] = p;
        }
      });
    }
    return map;
  }, [prs]);

  // Sort exercises: logged float to the top
  const sortedExercisesList = useMemo(() => {
    const list = [...exerciseData].map(ex => {
      const prData = prsMap[ex.key];
      return {
        ...ex,
        isLogged: !!prData,
        prWeight: prData ? prData.weight : 0,
        prReps: prData ? prData.reps : 0
      };
    });

    return list.sort((a, b) => {
      if (a.isLogged && !b.isLogged) return -1;
      if (!a.isLogged && b.isLogged) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [prsMap]);

  // Filter exercises by search query
  const filteredExercises = useMemo(() => {
    return sortedExercisesList.filter(ex =>
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sortedExercisesList, searchQuery]);

  // Load scheduler data on mount
  useEffect(() => {
    if (!uid) return;
    const loadSchedule = async () => {
      try {
        const docRef = doc(db, 'users', uid, 'planned_targets', 'weekly_schedule');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setSchedule(snap.data().schedule || schedule);
        }
      } catch (err) {
        console.error('[RoutineSandbox] Error loading schedule:', err);
      }
    };
    loadSchedule();
  }, [uid]);

  // Save scheduler data to Firestore
  const handleSaveSchedule = async () => {
    if (!uid) return;
    setSavingScheduler(true);
    setSchedulerSuccess(false);
    try {
      const docRef = doc(db, 'users', uid, 'planned_targets', 'weekly_schedule');
      await setDoc(docRef, { schedule, updatedAt: new Date() }, { merge: true });
      setSchedulerSuccess(true);
      setTimeout(() => setSchedulerSuccess(false), 2000);
    } catch (err) {
      console.error('[RoutineSandbox] Error saving schedule:', err);
    } finally {
      setSavingScheduler(false);
    }
  };

  const handleSelectExercise = (ex) => {
    setSelectedExercise(ex.name);
    setSelectedExerciseKey(ex.key);
    setDropdownOpen(false);
    setSearchQuery('');
  };

  const startAlgorithmRace = () => {
    setRacing(true);
    setSimResults(null);
    
    setTimeout(() => {
      setRacing(false);
      setSimResults({
        linear: { weeks: 12, maxWeight: 92.5, injuryRisk: 'High (32%)' },
        dup: { weeks: 10, maxWeight: 97.5, injuryRisk: 'Low (8%)' }
      });
    }, 2500);
  };

  // Reset tree simulation
  const resetTree = () => {
    setStepPath('step1');
  };

  return (
    <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col gap-6 text-left">
      
      {/* Header */}
      <div className="border-b border-[var(--border)] pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="font-display font-black text-xl text-white uppercase tracking-tight flex items-center gap-2">
            <LayoutGrid className="text-[var(--primary)]" size={20} />
            <span>Progression Algorithm Sandbox</span>
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Simulate progressive overload paths, design schedules, and race periodization models.
          </p>
        </div>
        
        {/* Tab Switcher */}
        <div className="flex border-2 border-black bg-black p-0.5 rounded-lg text-xs font-mono w-full md:w-auto">
          <button
            onClick={() => setActiveTab('tree')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md font-bold uppercase transition-all ${
              activeTab === 'tree' ? 'bg-[var(--primary)] text-white shadow-[2px_2px_0px_black]' : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            Recursion Tree
          </button>
          <button
            onClick={() => setActiveTab('racing')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md font-bold uppercase transition-all ${
              activeTab === 'racing' ? 'bg-[var(--primary)] text-white shadow-[2px_2px_0px_black]' : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            Algorithm Racing
          </button>
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-md font-bold uppercase transition-all ${
              activeTab === 'scheduler' ? 'bg-[var(--primary)] text-white shadow-[2px_2px_0px_black]' : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            Weekly Scheduler
          </button>
        </div>
      </div>

      {/* Control Selector with Custom Searchable Dropdown */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-[#111] pb-4">
        <div className="flex items-center gap-3 relative w-full sm:w-auto">
          <span className="text-xs font-mono font-bold text-[var(--text-secondary)] uppercase shrink-0">Focus Lift:</span>
          
          <div className="relative w-full sm:w-72">
            {/* Dropdown Toggle Button */}
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between bg-black border-2 border-black px-4 py-2 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-[var(--primary)] text-left shadow-[2px_2px_0px_black] hover:border-neutral-700"
            >
              <span>{selectedExercise}</span>
              <ChevronDown size={14} className="text-neutral-500" />
            </button>

            {/* Custom Dropdown Content */}
            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute left-0 right-0 mt-2 bg-[#090909] border-2 border-black p-3 rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,1)] z-50 max-h-[350px] overflow-hidden flex flex-col gap-2.5"
                >
                  <div className="relative shrink-0">
                    <input
                      type="text"
                      placeholder="Search lift..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-black border border-[#222] px-3 py-2 pl-8 rounded-lg text-xs font-mono text-white placeholder-neutral-700 focus:outline-none focus:border-[var(--primary)]"
                    />
                    <Search className="absolute left-2.5 top-2.5 text-neutral-700" size={12} />
                  </div>

                  <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin">
                    {filteredExercises.length === 0 ? (
                      <div className="text-center py-6 font-mono text-[10px] text-neutral-600 uppercase">
                        No exercises found
                      </div>
                    ) : (
                      filteredExercises.map((ex) => (
                        <button
                          key={ex.key}
                          onClick={() => handleSelectExercise(ex)}
                          className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                            ex.key === selectedExerciseKey
                              ? 'border-[var(--primary)] bg-neutral-900'
                              : 'border-transparent bg-transparent hover:bg-neutral-900/60'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-white">{ex.name}</span>
                            <span className="text-[8px] font-mono text-neutral-500 uppercase">{ex.muscleGroup}</span>
                          </div>
                          
                          <div className="shrink-0">
                            {ex.isLogged ? (
                              <span className="px-2 py-0.5 border border-[var(--accent-xp)] bg-[#b5ff2d10] text-[var(--accent-xp)] text-[8px] font-mono font-bold rounded">
                                ✅ {ex.prWeight}kg
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 border border-neutral-800 bg-neutral-900/50 text-neutral-600 text-[8px] font-mono font-bold rounded">
                                ⚪ Unlogged
                              </span>
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Logged Indicator Badge */}
          {prsMap[selectedExerciseKey] ? (
            <span className="px-2.5 py-1 border-2 border-black bg-[var(--accent-xp)] text-black text-[10px] font-mono font-bold rounded-lg shadow-[2px_2px_0px_black] uppercase shrink-0">
              Logged: {prsMap[selectedExerciseKey].weight}kg
            </span>
          ) : (
            <span className="px-2.5 py-1 border-2 border-black bg-neutral-900 text-neutral-500 text-[10px] font-mono font-bold rounded-lg shadow-[2px_2px_0px_black] uppercase shrink-0">
              Unlogged
            </span>
          )}
        </div>

        {activeTab === 'scheduler' && (
          <button
            onClick={handleSaveSchedule}
            disabled={savingScheduler}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-black bg-[var(--primary)] text-white font-mono text-xs font-bold uppercase rounded-lg shadow-[3px_3px_0px_black] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save size={12} />
            <span>{savingScheduler ? 'Saving...' : schedulerSuccess ? 'Saved!' : 'Save Weekly Schedule'}</span>
          </button>
        )}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {activeTab === 'tree' ? (
          <motion.div
            key="tree"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex flex-col gap-4"
          >
            {/* Logic Branch Visualizer */}
            <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden shadow-[3px_3px_0px_black]">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center font-mono text-xs font-bold border-b border-[var(--border)] pb-3 gap-2">
                <span className="text-[var(--text-secondary)] uppercase">オーバーロード (Interactive Overload Logic Branches)</span>
                <button
                  onClick={resetTree}
                  className="flex items-center gap-1 bg-black border border-[#222] hover:border-neutral-500 px-2 py-1 rounded text-[9px] text-neutral-400 hover:text-white transition-all uppercase"
                >
                  <RotateCcw size={10} />
                  <span>Reset Simulation</span>
                </button>
              </div>

              {/* Graphical Nodes */}
              <div className="flex flex-col gap-8 relative pl-4 border-l-2 border-neutral-800 mt-2">
                
                {/* Node 1: Evaluation */}
                <div className="relative">
                  <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-[var(--primary)] ring-4 ring-[var(--primary-glow)] animate-pulse" />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-mono font-black text-white uppercase flex items-center gap-1.5">
                      <span>Step 1: Evaluation (Session Complete)</span>
                      <span className="text-[9px] px-1.5 py-0.2 border border-[var(--primary)] text-[var(--primary)] font-mono uppercase rounded bg-[var(--primary-glow)] font-bold">Active</span>
                    </span>
                    <p className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                      Verify logged sets for <strong className="text-white">{selectedExercise}</strong> against planned overload targets.
                    </p>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => setStepPath('success')}
                      className={`px-4 py-2 border-2 border-black font-mono text-[10px] font-bold uppercase rounded-lg shadow-[2px_2px_0px_black] transition-all cursor-pointer ${
                        stepPath.startsWith('success') 
                          ? 'bg-[#33FF66] text-black border-black font-black' 
                          : 'bg-black text-[#33FF66] hover:border-[#33FF66]'
                      }`}
                    >
                      Simulate Success (Reps Met)
                    </button>
                    <button
                      onClick={() => setStepPath('failure')}
                      className={`px-4 py-2 border-2 border-black font-mono text-[10px] font-bold uppercase rounded-lg shadow-[2px_2px_0px_black] transition-all cursor-pointer ${
                        stepPath.startsWith('failure') || stepPath.startsWith('diagnosed')
                          ? 'bg-[#FF3366] text-black border-black font-black' 
                          : 'bg-black text-[#FF3366] hover:border-[#FF3366]'
                      }`}
                    >
                      Simulate Failure (Reps Missed)
                    </button>
                  </div>
                </div>

                {/* Path A: Success */}
                <div className={`transition-all duration-300 ${
                  stepPath.startsWith('success') 
                    ? 'opacity-100 filter-none border-l border-[var(--secondary)] pl-3 ml-1' 
                    : 'opacity-25 blur-[0.2px] border-l border-dashed border-neutral-900 pl-3 ml-1 pointer-events-none'
                }`}>
                  <div className="flex flex-col gap-6">
                    
                    {/* Node 2A: Weight Progression */}
                    <div className="relative text-left">
                      <div className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-[#33FF66]" />
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-black text-[#33FF66] uppercase">Step 2A: Overload Increment (+2.5kg)</span>
                        <p className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                          Since reps were met, increment target load by 2.5 kg for next week.
                        </p>
                        <div className="mt-2 text-[9px] font-mono text-neutral-500 uppercase font-bold">
                          next_target_weight = recent_max + 2.5kg
                        </div>
                      </div>
                    </div>

                    {/* Node 3A: Exam Buffer Check */}
                    <div className="border border-[#222] bg-black/40 p-4 rounded-xl flex flex-col gap-3">
                      <span className="text-[10px] font-mono text-[var(--secondary)] uppercase font-extrabold tracking-wider">
                        Step 3A: Sessional Exam Buffer Check
                      </span>
                      <p className="text-[10px] text-[var(--text-secondary)] font-sans leading-relaxed">
                        Does this workout date overlap with sessional exams configured in your Profile?
                      </p>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => setExamDeloadActive(false)}
                          disabled={!stepPath.startsWith('success')}
                          className={`px-3 py-1.5 rounded font-mono text-[9px] font-bold border transition-all cursor-pointer ${
                            !examDeloadActive ? 'bg-[var(--primary)] text-black border-black font-black' : 'bg-black text-neutral-500 border-neutral-800'
                          }`}
                        >
                          No (Normal Mode)
                        </button>
                        <button
                          onClick={() => setExamDeloadActive(true)}
                          disabled={!stepPath.startsWith('success')}
                          className={`px-3 py-1.5 rounded font-mono text-[9px] font-bold border transition-all cursor-pointer ${
                            examDeloadActive ? 'bg-[#33FF66] text-black border-black font-black' : 'bg-black text-neutral-500 border-neutral-800'
                          }`}
                        >
                          Yes (Exam Deload Active)
                        </button>
                      </div>

                      {examDeloadActive ? (
                        <div className="border-t border-[#222] pt-2.5 mt-1 text-[10px] font-sans text-amber-400 flex flex-col gap-1">
                          <span className="font-bold font-mono">1/9th Volume Gate Applied:</span>
                          <span>Target weight is maintained at +2.5kg, but working sets are capped at 1 set (1/9th total volume) to maximize recovery during exams!</span>
                        </div>
                      ) : (
                        <div className="border-t border-[#222] pt-2.5 mt-1 text-[10px] font-sans text-[#33FF66] flex flex-col gap-1">
                          <span className="font-bold font-mono">Normal Overload Applied:</span>
                          <span>Standard 5 sets of 5 reps programmed at +2.5kg.</span>
                        </div>
                      )}
                    </div>

                    {/* Node 4A: Commit Plan */}
                    <div className="border border-black bg-black p-3.5 rounded-xl flex items-center justify-between font-mono text-[10px] text-[#33FF66]">
                      <span className="font-bold uppercase">🎉 Step 4A: Target Plan Pushed to Firestore</span>
                      <span className="bg-[#33FF66]/10 px-2 py-0.5 rounded font-extrabold border border-[#33FF66]/20">COMMITTED</span>
                    </div>

                  </div>
                </div>

                {/* Path B: Failure */}
                <div className={`transition-all duration-300 ${
                  stepPath.startsWith('failure') || stepPath.startsWith('diagnosed')
                    ? 'opacity-100 filter-none border-l border-red-900 pl-3 ml-1' 
                    : 'opacity-25 blur-[0.2px] border-l border-dashed border-neutral-900 pl-3 ml-1 pointer-events-none'
                }`}>
                  <div className="flex flex-col gap-6">
                    
                    {/* Node 2B: Stall Counter Check */}
                    <div className="relative text-left">
                      <div className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-[#FF3366]" />
                      <div className="flex flex-col">
                        <span className="text-xs font-mono font-black text-[#FF3366] uppercase">Step 2B: Stall Counter Tracking</span>
                        <p className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                          Check consecutive weeks stalled on <strong className="text-white">{selectedExercise}</strong> from the database.
                        </p>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => setStepPath('failure_minor')}
                          disabled={!(stepPath.startsWith('failure') || stepPath.startsWith('diagnosed'))}
                          className={`px-4 py-2 border-2 border-black font-mono text-[10px] font-bold uppercase rounded-lg shadow-[2px_2px_0px_black] transition-all cursor-pointer ${
                            stepPath === 'failure_minor'
                              ? 'bg-amber-500 text-black border-black font-black'
                              : 'bg-black text-white hover:border-neutral-500'
                          }`}
                        >
                          1 or 2 Stalled Weeks
                        </button>
                        <button
                          onClick={() => setStepPath('failure_codered')}
                          disabled={!(stepPath.startsWith('failure') || stepPath.startsWith('diagnosed'))}
                          className={`px-4 py-2 border-2 border-black font-mono text-[10px] font-bold uppercase rounded-lg shadow-[2px_2px_0px_black] transition-all cursor-pointer ${
                            stepPath.startsWith('failure_codered') || stepPath.startsWith('diagnosed')
                              ? 'bg-[#FF3366] text-black border-black font-black'
                              : 'bg-black text-[#FF3366] hover:border-[#FF3366]'
                          }`}
                        >
                          3+ Stalled Weeks (Code Red!)
                        </button>
                      </div>
                    </div>

                    {/* Path B1: Minor Stall */}
                    <div className={`transition-all duration-300 ${
                      stepPath === 'failure_minor'
                        ? 'opacity-100'
                        : 'opacity-25 blur-[0.2px] pointer-events-none hidden'
                    }`}>
                      <div className="relative text-left">
                        <div className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-amber-500" />
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-black text-amber-500 uppercase">Step 3B: Retain Target load</span>
                          <p className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                            Failing is normal. The target load is kept identical for next week. Monitor consistency.
                          </p>
                          <div className="mt-2.5 bg-black/60 border border-[#222] p-3 rounded-xl font-mono text-[9px] text-amber-400">
                            STATUS: Target weight kept. Re-attempt next micro-cycle.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Path B2: Code Red Plateau Autopsy */}
                    <div className={`transition-all duration-300 ${
                      stepPath.startsWith('failure_codered') || stepPath.startsWith('diagnosed')
                        ? 'opacity-100 filter-none' 
                        : 'opacity-25 blur-[0.2px] pointer-events-none'
                    }`}>
                      <div className="flex flex-col gap-6">
                        
                        {/* Step 3C: Autopsy Questionnaire */}
                        <div className="relative text-left">
                          <div className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-red-600" />
                          <div className="flex flex-col">
                            <span className="text-xs font-mono font-black text-red-500 uppercase">Step 3C: Code Red Plateau Autopsy</span>
                            <p className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                              LIFT LOCKED! 3 consecutive weeks stalled. Biomechanical diagnosis is required to patch the movement.
                            </p>
                          </div>

                          <div className="border border-[#333] bg-black/60 p-4 rounded-xl flex flex-col gap-3 mt-4">
                            <span className="text-[10px] font-mono text-white font-extrabold uppercase flex items-center gap-1.5">
                              <span>PLATEAU AUTOPSY: Where did you fail/stall during the rep?</span>
                            </span>
                            
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => setStepPath('diagnosed_bottom')}
                                disabled={!(stepPath.startsWith('failure_codered') || stepPath.startsWith('diagnosed'))}
                                className={`w-full text-left border p-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                  stepPath === 'diagnosed_bottom'
                                    ? 'bg-red-950 border-red-500 text-white font-bold'
                                    : 'bg-black border-[#222] hover:border-red-500 text-neutral-300'
                                }`}
                              >
                                {autopsyConfig.bottomText}
                              </button>
                              <button
                                onClick={() => setStepPath('diagnosed_mid')}
                                disabled={!(stepPath.startsWith('failure_codered') || stepPath.startsWith('diagnosed'))}
                                className={`w-full text-left border p-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                  stepPath === 'diagnosed_mid'
                                    ? 'bg-red-950 border-red-500 text-white font-bold'
                                    : 'bg-black border-[#222] hover:border-red-500 text-neutral-300'
                                }`}
                              >
                                {autopsyConfig.midText}
                              </button>
                              <button
                                onClick={() => setStepPath('diagnosed_top')}
                                disabled={!(stepPath.startsWith('failure_codered') || stepPath.startsWith('diagnosed'))}
                                className={`w-full text-left border p-2.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                                  stepPath === 'diagnosed_top'
                                    ? 'bg-red-950 border-red-500 text-white font-bold'
                                    : 'bg-black border-[#222] hover:border-red-500 text-neutral-300'
                                }`}
                              >
                                {autopsyConfig.topText}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Step 4C: Accessory Patch */}
                        <div className={`transition-all duration-300 ${
                          stepPath.startsWith('diagnosed')
                            ? 'opacity-100'
                            : 'opacity-25 blur-[0.2px] pointer-events-none'
                        }`}>
                          <div className="relative text-left">
                            <div className="absolute -left-[20px] top-1.5 w-2 h-2 rounded-full bg-[#33FF66]" />
                            <div className="flex flex-col gap-3">
                              <div>
                                <span className="text-xs font-mono font-black text-[#33FF66] uppercase">Step 4C: Accessory Patch Injected</span>
                                <p className="text-[10px] text-[var(--text-secondary)] font-sans mt-0.5">
                                  Biomechanical failure analyzed. Prescribed accessory movements have been dynamically injected into your target plan.
                                </p>
                              </div>

                              <div className="bg-[#33FF66]/10 border border-[#33FF66]/20 p-4 rounded-xl font-mono text-[10px] text-white flex flex-col gap-1.5">
                                <span className="text-[#33FF66] font-bold uppercase">Autopsy Report Details:</span>
                                {stepPath === 'diagnosed_bottom' && (
                                  <>
                                    <div>• <strong className="text-white">Weakness:</strong> {autopsyConfig.bottomReport.weakness}</div>
                                    <div>• <strong className="text-[#33FF66]">Prescribed Fixes:</strong> {autopsyConfig.bottomReport.fixes}</div>
                                  </>
                                )}
                                {stepPath === 'diagnosed_mid' && (
                                  <>
                                    <div>• <strong className="text-white">Weakness:</strong> {autopsyConfig.midReport.weakness}</div>
                                    <div>• <strong className="text-[#33FF66]">Prescribed Fixes:</strong> {autopsyConfig.midReport.fixes}</div>
                                  </>
                                )}
                                {stepPath === 'diagnosed_top' && (
                                  <>
                                    <div>• <strong className="text-white">Weakness:</strong> {autopsyConfig.topReport.weakness}</div>
                                    <div>• <strong className="text-[#33FF66]">Prescribed Fixes:</strong> {autopsyConfig.topReport.fixes}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        ) : activeTab === 'racing' ? (
          <motion.div
            key="racing"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex flex-col gap-4"
          >
            {/* Simulation Pane */}
            <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-5 rounded-xl flex flex-col gap-4 shadow-[3px_3px_0px_black]">
              <div className="flex justify-between items-center font-mono text-xs font-bold border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-secondary)] uppercase">Periodization Race Simulator</span>
                <button
                  onClick={startAlgorithmRace}
                  disabled={racing}
                  className="flex items-center gap-1.5 bg-black border border-[#222] hover:border-[var(--primary)] px-3 py-1 rounded-md text-[10px] text-white transition-all uppercase font-bold"
                >
                  <Play size={10} className="text-[var(--primary)]" />
                  <span>{racing ? 'Simulating...' : 'Run Simulation'}</span>
                </button>
              </div>

              {/* Race Visual Tracks */}
              <div className="flex flex-col gap-4 mt-2">
                
                {/* Track 1: Linear */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-[var(--text-secondary)] font-bold uppercase">
                    <span>Linear Periodization</span>
                    {simResults && <span className="text-[#FF3366]">Completed ({simResults.linear.weeks}w)</span>}
                  </div>
                  <div className="h-6 border-2 border-black bg-black rounded-lg overflow-hidden relative flex items-center">
                    <motion.div
                      animate={{ width: racing ? '80%' : simResults ? '100%' : '15%' }}
                      transition={{ duration: racing ? 2.5 : 0.2 }}
                      className="h-full bg-gradient-to-r from-[var(--primary)] to-amber-500 flex items-center justify-end px-2"
                    >
                      <Code size={12} className="text-white" />
                    </motion.div>
                  </div>
                </div>

                {/* Track 2: DUP */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] font-mono text-[var(--text-secondary)] font-bold uppercase">
                    <span>Daily Undulating Periodization (DUP)</span>
                    {simResults && <span className="text-[#33FF66]">Completed ({simResults.dup.weeks}w) ⚡</span>}
                  </div>
                  <div className="h-6 border-2 border-black bg-black rounded-lg overflow-hidden relative flex items-center">
                    <motion.div
                      animate={{ width: racing ? '100%' : simResults ? '100%' : '20%' }}
                      transition={{ duration: racing ? 2.0 : 0.2 }}
                      className="h-full bg-gradient-to-r from-[var(--secondary)] to-cyan-400 flex items-center justify-end px-2"
                    >
                      <Sparkles size={12} className="text-white" />
                    </motion.div>
                  </div>
                </div>

              </div>

              {/* Sim Results */}
              {simResults && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-[var(--border)] pt-4 mt-2">
                  <div className="bg-black/60 p-3 rounded-lg border border-[#222] font-mono text-[10px]">
                    <span className="text-[var(--primary)] uppercase font-bold">Linear Model Results</span>
                    <ul className="flex flex-col gap-1 text-[var(--text-secondary)] mt-1.5">
                      <li>Max Projection: <strong className="text-white">{simResults.linear.maxWeight}kg</strong></li>
                      <li>Estimated Stalls: <strong>2</strong></li>
                      <li>Injury Probability: <strong className="text-red-500">{simResults.linear.injuryRisk}</strong></li>
                    </ul>
                  </div>
                  <div className="bg-black/60 p-3 rounded-lg border border-[#222] font-mono text-[10px]">
                    <span className="text-[var(--secondary)] uppercase font-bold">DUP Model Results</span>
                    <ul className="flex flex-col gap-1 text-[var(--text-secondary)] mt-1.5">
                      <li>Max Projection: <strong className="text-white">{simResults.dup.maxWeight}kg</strong></li>
                      <li>Estimated Stalls: <strong>0</strong></li>
                      <li>Injury Probability: <strong className="text-[#33FF66]">{simResults.dup.injuryRisk}</strong></li>
                    </ul>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        ) : (
          <motion.div
            key="scheduler"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="flex flex-col gap-4 text-left"
          >
            {/* Weekly Scheduler interface */}
            <div className="border border-[var(--border)] bg-[var(--bg-elevated)] p-5 rounded-xl flex flex-col gap-4 shadow-[3px_3px_0px_black]">
              <div className="flex justify-between items-center border-b border-[var(--border)] pb-2.5">
                <span className="text-[12px] font-mono text-[var(--text-secondary)] uppercase font-bold flex items-center gap-1.5">
                  <Calendar size={14} className="text-[var(--primary)]" />
                  <span>Interactive Workout Day Planner</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  Saves schedule to planned_targets
                </span>
              </div>

              {/* Day Grid */}
              <div className="flex flex-col gap-3.5 mt-1">
                {Object.keys(schedule).map((day) => (
                  <div key={day} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border border-black bg-black/30 rounded-xl gap-3">
                    {/* Day Name */}
                    <div className="w-24 shrink-0">
                      <span className="text-sm font-display font-black text-white uppercase">{day}</span>
                    </div>

                    {/* Workout Focus Select */}
                    <div className="w-full sm:w-56 shrink-0">
                      <select
                        value={schedule[day].focus}
                        onChange={(e) => {
                          const updated = { ...schedule };
                          updated[day].focus = e.target.value;
                          setSchedule(updated);
                        }}
                        className="w-full bg-black border border-[#222] px-3 py-1.5 rounded-lg text-xs font-mono text-white focus:outline-none focus:border-[var(--primary)]"
                      >
                        <option value="Rest Day">Rest Day</option>
                        <option value="Push Day">Push Day (Chest/Delts/Triceps)</option>
                        <option value="Pull Day">Pull Day (Lats/Upper Back/Biceps)</option>
                        <option value="Legs Day">Legs Day (Quads/Hamstrings/Calves)</option>
                        <option value="Upper Body">Upper Body Focus</option>
                        <option value="Lower Body">Lower Body Focus</option>
                        <option value="Full Body">Full Body Work</option>
                        <option value="Active Recovery">Active Recovery</option>
                        <option value="Cardio & Core">Cardio & Core</option>
                      </select>
                    </div>

                    {/* Workout Notes */}
                    <div className="w-full">
                      <input
                        type="text"
                        value={schedule[day].notes}
                        onChange={(e) => {
                          const updated = { ...schedule };
                          updated[day].notes = e.target.value;
                          setSchedule(updated);
                        }}
                        placeholder="Add workout notes or specific scheduled lifts..."
                        className="w-full bg-black/60 border border-[#222] px-3 py-1.5 rounded-lg text-xs text-white placeholder-neutral-700 focus:outline-none focus:border-[var(--primary)]"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {schedulerSuccess && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#33FF66] justify-center mt-2">
                  <CheckCircle size={14} />
                  <span>Success: Workout schedule committed to plan target logs!</span>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
