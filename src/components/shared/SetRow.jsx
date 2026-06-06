import React, { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Minus, Plus, Check } from 'lucide-react';

/**
 * SetRow Component
 * The atomic unit of workout logging.
 *
 * Props:
 *   exerciseId: string,
 *   setIndex: number,
 *   set: { reps: number | string, weight: number | string, done: boolean },
 *   onUpdate: (field: 'weight' | 'reps', value: number) => void,
 *   onDone: () => void,
 *   isPR?: boolean,
 *   exerciseIndex?: number
 */
export const SetRow = ({
  exerciseId,
  setIndex,
  set,
  onUpdate,
  onDone,
  isPR = false,
  exerciseIndex = 0,
  isBodyweight = false,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Local state for inputs to allow smooth typing before blur/submit
  const [localWeight, setLocalWeight] = useState(set.weight ?? 0);
  const [localReps, setLocalReps] = useState(set.reps ?? 0);

  // Pop animation state to trigger row scale animation when a set is completed
  const [prevDone, setPrevDone] = useState(set.done);
  const [triggerPop, setTriggerPop] = useState(false);

  // Sync local state when set prop changes (e.g., loaded from store or changed externally)
  useEffect(() => {
    setLocalWeight(set.weight ?? 0);
  }, [set.weight]);

  useEffect(() => {
    setLocalReps(set.reps ?? 0);
  }, [set.reps]);

  // Only trigger the row pop animation on transition from false -> true
  useEffect(() => {
    if (set.done && !prevDone) {
      setTriggerPop(true);
    }
    setPrevDone(set.done);
  }, [set.done, prevDone]);

  // Spring animation properties for tapping buttons
  const buttonTapProps = shouldReduceMotion
    ? {}
    : {
        whileTap: { scale: 0.93 },
        transition: { type: 'spring', stiffness: 500, damping: 25 },
      };

  // ─── Input Handlers ──────────────────────────────────────────────────────────

  const handleWeightChange = (e) => {
    const val = e.target.value;
    // Allow empty string, numbers with up to one decimal place, or "BW" case-insensitively (only for bodyweight exercises)
    if (val === '' || /^\d*\.?\d*$/.test(val) || (isBodyweight && (/^bw$/i.test(val) || /^b$/i.test(val)))) {
      setLocalWeight(val);
    }
  };

  const handleWeightBlur = () => {
    const trimmed = typeof localWeight === 'string' ? localWeight.trim() : String(localWeight);
    if (isBodyweight && /^bw$/i.test(trimmed)) {
      setLocalWeight('BW');
      onUpdate('weight', 'BW');
      return;
    }
    let parsed = parseFloat(localWeight);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    // Avoid floating point precision issues by rounding to 2 decimal places
    parsed = parseFloat(parsed.toFixed(2));
    
    if (isBodyweight && parsed === 0) {
      setLocalWeight('BW');
      onUpdate('weight', 'BW');
    } else {
      setLocalWeight(parsed);
      onUpdate('weight', parsed);
    }
  };

  const handleRepsChange = (e) => {
    const val = e.target.value;
    // Allow empty string or integers only
    if (val === '' || /^\d*$/.test(val)) {
      setLocalReps(val);
    }
  };

  const handleRepsBlur = () => {
    let parsed = parseInt(localReps, 10);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    setLocalReps(parsed);
    onUpdate('reps', parsed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  // ─── Button Actions ──────────────────────────────────────────────────────────

  const handleWeightDecrement = () => {
    if (localWeight === 'BW') return;
    const current = parseFloat(localWeight) || 0;
    if (current === 0) {
      if (isBodyweight) {
        setLocalWeight('BW');
        onUpdate('weight', 'BW');
      }
    } else {
      const nextVal = Math.max(0, current - 2.5);
      const rounded = parseFloat(nextVal.toFixed(2));
      if (isBodyweight && rounded === 0) {
        setLocalWeight('BW');
        onUpdate('weight', 'BW');
      } else {
        setLocalWeight(rounded);
        onUpdate('weight', rounded);
      }
    }
  };

  const handleWeightIncrement = () => {
    if (localWeight === 'BW') {
      setLocalWeight(0);
      onUpdate('weight', 0);
    } else {
      const current = parseFloat(localWeight) || 0;
      const nextVal = current + 2.5;
      const rounded = parseFloat(nextVal.toFixed(2));
      setLocalWeight(rounded);
      onUpdate('weight', rounded);
    }
  };

  const handleRepsDecrement = () => {
    const current = parseInt(localReps, 10) || 0;
    const nextVal = Math.max(0, current - 1);
    setLocalReps(nextVal);
    onUpdate('reps', nextVal);
  };

  const handleRepsIncrement = () => {
    const current = parseInt(localReps, 10) || 0;
    const nextVal = current + 1;
    setLocalReps(nextVal);
    onUpdate('reps', nextVal);
  };

  // ─── Verification ──────────────────────────────────────────────────────────

  const parsedWeight = parseFloat(localWeight) || 0;
  const parsedReps = parseInt(localReps, 10) || 0;
  // Done button only activates if (isBodyweight is true and weight is BW/0/weighted) or (weight > 0) AND reps > 0
  const isDoneActive = (isBodyweight ? (localWeight === 'BW' || parsedWeight >= 0) : (parsedWeight > 0)) && parsedReps > 0;

  return (
    <motion.div
      animate={triggerPop ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      onAnimationComplete={() => setTriggerPop(false)}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
      className="flex items-center justify-between min-h-[44px] w-full gap-2 py-1.5 px-3 bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg"
      style={{ minHeight: '44px' }}
    >
      {/* Set Number */}
      <div className="font-mono text-sm text-[var(--text-secondary)] w-8 shrink-0 select-none text-left">
        {setIndex + 1}
      </div>

      {/* Weight Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <motion.button
          type="button"
          onClick={handleWeightDecrement}
          aria-label="Decrease weight by 2.5 kilograms"
          className="w-11 h-11 flex items-center justify-center border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:border-[var(--primary)] focus:outline-none transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
          {...buttonTapProps}
        >
          <Minus size={16} />
        </motion.button>

        <input
          type="text"
          inputMode="decimal"
          value={localWeight}
          onChange={handleWeightChange}
          onBlur={handleWeightBlur}
          onKeyDown={handleKeyDown}
          placeholder="0"
          aria-label={`Weight for set ${setIndex + 1}`}
          data-testid={`weight-${exerciseIndex}-${setIndex}`}
          className="font-mono text-xl text-[var(--text-primary)] bg-transparent border-none focus:outline-none text-center select-all placeholder:text-text-secondary"
          style={{ minWidth: '56px', width: '56px' }}
        />

        <motion.button
          type="button"
          onClick={handleWeightIncrement}
          aria-label="Increase weight by 2.5 kilograms"
          className="w-11 h-11 flex items-center justify-center border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:border-[var(--primary)] focus:outline-none transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
          {...buttonTapProps}
        >
          <Plus size={16} />
        </motion.button>
      </div>

      {/* kg Label */}
      <span className="font-body text-xs text-[var(--text-secondary)] select-none shrink-0 w-5 text-center">
        kg
      </span>

      {/* Reps Controls */}
      <div className="flex items-center gap-1 shrink-0">
        <motion.button
          type="button"
          onClick={handleRepsDecrement}
          aria-label="Decrease reps by 1"
          className="w-11 h-11 flex items-center justify-center border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:border-[var(--primary)] focus:outline-none transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
          {...buttonTapProps}
        >
          <Minus size={16} />
        </motion.button>

        <input
          type="text"
          inputMode="numeric"
          value={localReps}
          onChange={handleRepsChange}
          onBlur={handleRepsBlur}
          onKeyDown={handleKeyDown}
          placeholder="0"
          aria-label={`Reps for set ${setIndex + 1}`}
          data-testid={`reps-${exerciseIndex}-${setIndex}`}
          className="font-mono text-xl text-[var(--text-primary)] bg-transparent border-none focus:outline-none text-center select-all placeholder:text-text-secondary"
          style={{ minWidth: '56px', width: '56px' }}
        />

        <motion.button
          type="button"
          onClick={handleRepsIncrement}
          aria-label="Increase reps by 1"
          className="w-11 h-11 flex items-center justify-center border border-[var(--border)] rounded-lg text-[var(--text-primary)] hover:border-[var(--primary)] focus:outline-none transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
          {...buttonTapProps}
        >
          <Plus size={16} />
        </motion.button>
      </div>

      {/* reps Label */}
      <span className="font-body text-xs text-[var(--text-secondary)] select-none shrink-0 w-7 text-left">
        reps
      </span>

      {/* Done State & PR Badge */}
      <div className="flex items-center gap-2 shrink-0">
        <motion.button
          type="button"
          onClick={onDone}
          disabled={!isDoneActive}
          aria-label={`Mark set ${setIndex + 1} as completed`}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors focus:outline-none ${
            set.done
              ? 'bg-[var(--accent-xp)] border-none'
              : 'bg-transparent border-2 border-[var(--border)]'
          } ${
            !isDoneActive
              ? 'opacity-30 cursor-not-allowed'
              : 'hover:border-[var(--primary)] cursor-pointer'
          }`}
          style={{ minWidth: '44px', minHeight: '44px' }}
          data-testid={`set-done-${exerciseIndex}-${setIndex}`}
          {...buttonTapProps}
        >
          <motion.div
            initial={false}
            animate={{ scale: set.done ? 1 : 0 }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : { type: 'spring', stiffness: 500, damping: 22 }
            }
            className="flex items-center justify-center text-[#000]"
          >
            <Check size={20} strokeWidth={3} />
          </motion.div>
        </motion.button>

        {isPR && (
          <span className="font-mono text-xs text-[var(--accent-xp)] border border-[var(--accent-xp)] px-1.5 py-0.5 rounded uppercase font-extrabold select-none tracking-wider shrink-0">
            PR
          </span>
        )}
      </div>
    </motion.div>
  );
};
