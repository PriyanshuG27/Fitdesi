import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, X, Trophy, Dumbbell, Flame, Zap } from 'lucide-react';
import html2canvas from 'html2canvas';

export const WeeklyRecapScreen = ({ isOpen, onClose, recap, weekId, markAsSeen }) => {
  const [sharing, setSharing] = useState(false);
  const recapCardRef = useRef(null);

  if (!isOpen || !recap) return null;

  const weekNumber = weekId.split('-W')[1] || '';

  const handleClose = () => {
    markAsSeen();
    onClose();
  };

  const shareRecap = async () => {
    if (!recapCardRef.current || sharing) return;
    setSharing(true);
    try {
      // Render html2canvas
      const canvas = await html2canvas(recapCardRef.current, {
        backgroundColor: '#080808',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to generate image blob');

      const filename = `zenkai-recap-week-${weekNumber}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Zenkai Week',
          text: `Check out my Zenkai weekly recap for Week ${weekNumber}! ⚡`,
        });
      } else {
        // Desktop fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error sharing recap:', err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <>
      {/* ─── MAIN OVERLAY ─── */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-0 md:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full h-full md:h-auto md:max-w-md md:w-full bg-[var(--bg-base)] md:bg-[var(--bg-surface)] border-0 md:border-2 border-[var(--border)] md:rounded-lg shadow-2xl p-6 flex flex-col justify-between md:justify-start gap-6 overflow-y-auto relative text-[var(--text-primary)]"
        >
          {/* Close Button Top Right */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-full border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors active:scale-95"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          {/* Content Area */}
          <div className="flex flex-col gap-6 mt-4">
            {/* Header */}
            <div className="text-center md:text-left">
              <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                Weekly Summary
              </span>
              <h2 className="font-display text-4xl font-extrabold tracking-tight uppercase mt-1 font-barlow text-[var(--text-primary)]">
                WEEK {weekNumber}
              </h2>
            </div>

            {/* Hero Stat */}
            <div className="flex flex-col items-center justify-center p-6 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] relative overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <div className="absolute top-2 right-2 opacity-15">
                <Trophy size={40} className="text-[var(--accent-xp)]" />
              </div>
              <span className="font-mono text-7xl font-bold tracking-tight text-[var(--accent-xp)] font-dm">
                {recap.sessionsCount}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--text-secondary)] mt-2">
                Workouts Logged
              </span>
            </div>

            {/* Stats Grid (2x2) */}
            <div className="grid grid-cols-2 gap-4">
              {/* Total Volume */}
              <div className="p-4 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] flex flex-col shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <span className="font-mono text-2xl font-bold text-[var(--secondary)] font-dm">
                  {recap.totalVolume.toLocaleString()} kg
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mt-1">
                  Total Volume
                </span>
              </div>

              {/* PRs Broken */}
              <div className="p-4 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] flex flex-col shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <span className="font-mono text-2xl font-bold text-[var(--primary)] font-dm">
                  {recap.prsBrokenCount}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mt-1">
                  PRs Broken
                </span>
              </div>

              {/* XP Earned */}
              <div className="p-4 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] flex flex-col shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <span className="font-mono text-2xl font-bold text-[var(--accent-xp)] font-dm">
                  +{recap.xpEarned}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mt-1">
                  XP Earned
                </span>
              </div>

              {/* Streak */}
              <div className="p-4 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] flex flex-col shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                <span className="font-mono text-2xl font-bold text-[var(--text-primary)] font-dm">
                  {recap.streak} days
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--text-secondary)] mt-1">
                  Streak Status
                </span>
              </div>
            </div>

            {/* Best Lift */}
            <div className="p-4 rounded-lg border-2 border-[var(--border)] bg-[var(--surface)] flex flex-col gap-2 shadow-[2px_2px_0px_rgba(0,0,0,1)]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                BEST LIFT THIS WEEK
              </span>
              {recap.bestLift ? (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded bg-[#ff5c000f] text-[var(--primary)] border border-[var(--primary)] shrink-0">
                    <Dumbbell size={16} />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display font-bold text-sm uppercase tracking-wide">
                      {recap.bestLift.name}
                    </span>
                    <span className="font-mono text-xs text-[var(--secondary)] font-dm mt-0.5">
                      {recap.bestLift.weight === 'BW' ? `BW (x${recap.bestLift.reps || 0} reps)` : `${recap.bestLift.weight} kg`}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="font-mono text-xs text-[var(--text-muted)] italic">
                  No lifts recorded
                </span>
              )}
            </div>

            {/* Motivational Slogan */}
            <div className="text-center mt-2 px-4">
              <p className="font-sans text-sm text-[var(--text-secondary)] italic leading-relaxed">
                "{recap.motivationalLine}"
              </p>
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex gap-4 mt-6 border-t-2 border-[var(--border)] pt-4">
            <button
              onClick={shareRecap}
              disabled={sharing}
              className="flex-1 flex justify-center items-center gap-2 py-3 rounded-md border-2 border-[var(--secondary)] bg-[#00d4ff0f] hover:bg-[#00d4ff1f] text-[var(--secondary)] font-display font-extrabold text-sm uppercase tracking-wide transition-colors cursor-pointer select-none active:scale-95 disabled:opacity-50"
            >
              <Share2 size={16} />
              {sharing ? 'Generating...' : 'Share Recap'}
            </button>
            <button
              onClick={handleClose}
              className="flex-1 py-3 rounded-md border-2 border-[var(--border)] bg-[var(--surface)] hover:border-[var(--text-primary)] text-[var(--text-primary)] font-display font-extrabold text-sm uppercase tracking-wide transition-colors cursor-pointer select-none active:scale-95"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>

      {/* ─── HIDDEN SHAREABLE CARD FOR SCREENSHOT (html2canvas renderable but off-screen) ─── */}
      <div
        ref={recapCardRef}
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '400px',
          height: '600px',
        }}
        className="bg-[#080808] text-[#F0F0F0] border-4 border-[#FF5C00] p-8 flex flex-col justify-between font-sans relative overflow-hidden"
      >
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5C00]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#00D4FF]/10 rounded-full blur-3xl" />

        {/* Branding & Week Header */}
        <div className="flex justify-between items-start border-b border-[#222222] pb-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#888888]">
              Weekly Stats Card
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight uppercase mt-0.5" style={{ fontFamily: 'Barlow Condensed' }}>
              WEEK {weekNumber}
            </h1>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xl font-extrabold text-[#FF5C00] tracking-wide" style={{ fontFamily: 'Barlow Condensed' }}>
              ZENKAI
            </span>
            <span className="text-[7px] font-mono text-[#888888] tracking-widest mt-0.5">
              TRAIN SMARTER
            </span>
          </div>
        </div>

        {/* Hero Stat Block */}
        <div className="my-4 flex flex-col items-center justify-center p-6 border-2 border-[#222222] bg-[#111111] rounded-lg">
          <span className="text-6xl font-bold tracking-tight text-[#B5FF2D] font-mono" style={{ fontFamily: 'DM Mono' }}>
            {recap.sessionsCount}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#888888] mt-2">
            Workouts Logged This Week
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border-2 border-[#222222] bg-[#111111] rounded-lg flex flex-col">
            <span className="text-xl font-bold text-[#00D4FF] font-mono" style={{ fontFamily: 'DM Mono' }}>
              {recap.totalVolume.toLocaleString()} kg
            </span>
            <span className="text-[8px] font-mono uppercase tracking-wider text-[#888888] mt-1">
              Total Volume
            </span>
          </div>

          <div className="p-3 border-2 border-[#222222] bg-[#111111] rounded-lg flex flex-col">
            <span className="text-xl font-bold text-[#FF5C00] font-mono" style={{ fontFamily: 'DM Mono' }}>
              {recap.prsBrokenCount}
            </span>
            <span className="text-[8px] font-mono uppercase tracking-wider text-[#888888] mt-1">
              PRs Broken
            </span>
          </div>

          <div className="p-3 border-2 border-[#222222] bg-[#111111] rounded-lg flex flex-col">
            <span className="text-xl font-bold text-[#B5FF2D] font-mono" style={{ fontFamily: 'DM Mono' }}>
              +{recap.xpEarned}
            </span>
            <span className="text-[8px] font-mono uppercase tracking-wider text-[#888888] mt-1">
              XP Earned
            </span>
          </div>

          <div className="p-3 border-2 border-[#222222] bg-[#111111] rounded-lg flex flex-col">
            <span className="text-xl font-bold text-[#F0F0F0] font-mono" style={{ fontFamily: 'DM Mono' }}>
              {recap.streak} days
            </span>
            <span className="text-[8px] font-mono uppercase tracking-wider text-[#888888] mt-1">
              Active Streak
            </span>
          </div>
        </div>

        {/* Highlight Best Lift */}
        <div className="p-4 border-2 border-[#222222] bg-[#111111] rounded-lg flex flex-col gap-1.5">
          <span className="text-[9px] font-mono uppercase tracking-wider text-[#888888]">
            BEST LIFT THIS WEEK
          </span>
          {recap.bestLift ? (
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wide text-[#F0F0F0]">
                {recap.bestLift.name}
              </span>
              <span className="text-xs font-mono text-[#00D4FF]" style={{ fontFamily: 'DM Mono' }}>
                {recap.bestLift.weight === 'BW' ? `BW (x${recap.bestLift.reps || 0} reps)` : `${recap.bestLift.weight} kg`}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-[#444444] italic">No lifts logged</span>
          )}
        </div>

        {/* Motivational Line Footer */}
        <div className="border-t border-[#222222] pt-4 text-center">
          <p className="text-xs text-[#888888] italic">
            "{recap.motivationalLine}"
          </p>
        </div>
      </div>
    </>
  );
};
