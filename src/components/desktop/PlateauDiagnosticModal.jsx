import React, { useState } from 'react';
import { ShieldAlert, ChevronRight, CheckCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PlateauDiagnosticModal = ({ isOpen, onClose, exerciseName = 'Barbell Bench Press', onPrescribe }) => {
  const [step, setStep] = useState(1); // 1: Alert, 2: Questionnaire, 3: Patch/Resolution
  const [failurePoint, setFailurePoint] = useState(null);

  const handleDiagnose = (point) => {
    setFailurePoint(point);
    setStep(3);
  };

  const getPrescription = () => {
    if (failurePoint === 'bottom') {
      return {
        focus: 'Bottom Range Weakness (Off the chest/floor)',
        exercises: ['Pause Bench Press (3 sets x 5 reps - focus on 2s pause at bottom)', 'Deficit Push-ups (3 sets x RPE 8)'],
        rationale: 'Focuses on building rate of force development (RFD) from a dead stop.'
      };
    }
    if (failurePoint === 'mid') {
      return {
        focus: 'Mid-Range Sticking Point',
        exercises: ['Spoto Press (3 sets x 6 reps - hover 1 inch off chest)', 'Larsen Press (3 sets x 8 reps - legs floating)'],
        rationale: 'Addresses shoulder/pec transition strength and core stability.'
      };
    }
    return {
      focus: 'Lockout Weakness (Triceps/Elbow extension)',
      exercises: ['Board / Pin Press (3 sets x 5 reps - upper half of range)', 'Close Grip Bench Press (3 sets x 8 reps)'],
      rationale: 'Overloads the triceps and upper pectorals at the lockout range.'
    };
  };

  const handleApplyPatch = () => {
    if (onPrescribe) {
      onPrescribe(getPrescription());
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="w-full max-w-md border-4 border-black bg-[#111] rounded-2xl shadow-[8px_8px_0px_rgba(0,0,0,1)] overflow-hidden">
        
        {/* Header */}
        <div className="border-b-4 border-black bg-[#FF3366] px-4 py-3 flex items-center gap-2 font-mono text-xs text-black uppercase font-black">
          <ShieldAlert size={16} />
          <span>CODE RED: PROGRESSION PLATELAU DETECTED</span>
        </div>

        {/* Content */}
        <div className="p-6 text-left">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1.5 border border-[#FF3366]/20 bg-[#FF3366]/5 p-4 rounded-xl">
                  <span className="text-sm font-mono font-bold text-[#FF3366] uppercase">3-Week Stagnation</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    FitDesi telemetry signals a 3-week stalled progression on **{exerciseName}**. Adding more weight blindly will result in injury or systemic fatigue.
                  </p>
                </div>
                
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  We have temporarily locked this exercise in your sandbox. Let's perform a biomechanical diagnostic autopsy to identify the exact muscle failure point.
                </p>

                <button
                  onClick={() => setStep(2)}
                  className="flex items-center justify-center gap-1.5 border-2 border-black bg-[#FF3366] text-black px-4 py-2.5 rounded-lg shadow-[3px_3px_0px_black] text-xs font-mono font-bold uppercase hover:brightness-110 transition-all mt-2"
                >
                  <span>Begin Diagnostic Autopsy</span>
                  <ChevronRight size={14} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col gap-4"
              >
                <span className="text-xs font-mono font-bold text-white uppercase">Biomechanical Sticking Point</span>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Where exactly does the bar stall or slow down during your heavy sets?
                </p>

                <div className="flex flex-col gap-3 mt-1.5">
                  <button
                    onClick={() => handleDiagnose('bottom')}
                    className="w-full border-2 border-black bg-black p-3.5 rounded-xl text-left hover:border-[var(--primary)] transition-all font-mono text-xs flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <span className="text-white font-bold uppercase">A) Bottom Range / Off Chest</span>
                      <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">Struggling to push the weight off the chest.</span>
                    </div>
                    <ChevronRight size={14} className="text-[#444]" />
                  </button>

                  <button
                    onClick={() => handleDiagnose('mid')}
                    className="w-full border-2 border-black bg-black p-3.5 rounded-xl text-left hover:border-[var(--primary)] transition-all font-mono text-xs flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <span className="text-white font-bold uppercase">B) Mid-Range / Sticking Point</span>
                      <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">Slows down halfway up before lockout.</span>
                    </div>
                    <ChevronRight size={14} className="text-[#444]" />
                  </button>

                  <button
                    onClick={() => handleDiagnose('top')}
                    className="w-full border-2 border-black bg-black p-3.5 rounded-xl text-left hover:border-[var(--primary)] transition-all font-mono text-xs flex justify-between items-center"
                  >
                    <div className="flex flex-col">
                      <span className="text-white font-bold uppercase">C) Lockout Range / Elbow Extension</span>
                      <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">Difficulty straightening elbows at the top.</span>
                    </div>
                    <ChevronRight size={14} className="text-[#444]" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex flex-col gap-4"
              >
                <div className="flex flex-col gap-1 border border-[#33FF66]/20 bg-[#33FF66]/5 p-4 rounded-xl">
                  <span className="text-xs font-mono font-bold text-[#33FF66] uppercase">Autopsy Complete: Weakness Identified</span>
                  <span className="text-xs font-mono font-black text-white uppercase mt-1">
                    {getPrescription().focus}
                  </span>
                </div>

                <div className="flex flex-col gap-2 bg-black/60 p-4 rounded-xl border border-[#222]">
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase font-bold">Injecting Accessory Patch</span>
                  <ul className="flex flex-col gap-1.5 font-mono text-xs text-white">
                    {getPrescription().exercises.map((ex, i) => (
                      <li key={i} className="flex gap-1.5 items-start">
                        <span className="text-[var(--primary)]">➔</span>
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed mt-2 pt-2 border-t border-[#222]">
                    Rationale: {getPrescription().rationale}
                  </p>
                </div>

                <button
                  onClick={handleApplyPatch}
                  className="flex items-center justify-center gap-1.5 border-2 border-black bg-[#33FF66] text-black px-4 py-2.5 rounded-lg shadow-[3px_3px_0px_black] text-xs font-mono font-bold uppercase hover:brightness-110 transition-all mt-2"
                >
                  <CheckCircle size={14} />
                  <span>Apply Patch to Sandbox</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
};
