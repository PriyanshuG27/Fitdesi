import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Zap, Flame } from 'lucide-react';

export const NeubrutalistCalendar = ({ sessions = [], onSelectSession = null, isMobile = false }) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  // Format Date to local YYYY-MM-DD
  const getYYYYMMDD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Group sessions by local YYYY-MM-DD string
  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach((sess) => {
      if (!sess.date) return;
      const dateObj = sess.date instanceof Date ? sess.date : new Date(sess.date);
      if (isNaN(dateObj.getTime())) return;
      const key = getYYYYMMDD(dateObj);
      if (!map[key]) map[key] = [];
      map[key].push(sess);
    });
    return map;
  }, [sessions]);

  // Calendar calculations
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday...
  // Convert firstDayIndex so Monday is index 0
  const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const daysGrid = useMemo(() => {
    const grid = [];
    // Previous month filler days
    for (let i = 0; i < adjustedFirstDayIndex; i++) {
      grid.push({ isFiller: true });
    }
    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const dateKey = getYYYYMMDD(cellDate);
      grid.push({
        dayNumber: d,
        dateKey,
        isFiller: false,
        sessionsList: sessionsByDate[dateKey] || []
      });
    }
    return grid;
  }, [year, month, daysInMonth, adjustedFirstDayIndex, sessionsByDate]);

  // Selected date details
  const [selectedCell, setSelectedCell] = useState(null);

  const handleCellClick = (cell) => {
    if (cell.isFiller || !cell.sessionsList.length) {
      setSelectedCell(null);
      return;
    }
    setSelectedCell(cell);
  };

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="border-2 border-black bg-[var(--surface)] p-4 rounded-2xl shadow-[4px_4px_0px_black] text-left font-mono text-xs flex flex-col gap-4">
      
      {/* Calendar Navigation */}
      <div className="flex justify-between items-center border-b border-[#222] pb-3">
        <span className="font-display font-black text-sm text-white uppercase tracking-tight">
          {monthNames[month]} {year}
        </span>
        <div className="flex gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1 border border-black bg-black text-[var(--primary)] rounded hover:bg-[var(--primary)] hover:text-black cursor-pointer transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 border border-black bg-black text-[var(--primary)] rounded hover:bg-[var(--primary)] hover:text-black cursor-pointer transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1.5 text-center font-bold text-[9px] text-[var(--text-secondary)] uppercase">
        {weekdays.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {daysGrid.map((cell, idx) => {
          if (cell.isFiller) {
            return <div key={`filler-${idx}`} className="aspect-square opacity-20" />;
          }

          const hasWorkout = cell.sessionsList.length > 0;
          const isSelected = selectedCell?.dateKey === cell.dateKey;

          return (
            <button
              key={cell.dateKey}
              onClick={() => handleCellClick(cell)}
              className={`aspect-square rounded-lg border flex flex-col items-center justify-between p-1 transition-all select-none relative ${
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary-glow)] text-[var(--primary)] shadow-[2px_2px_0px_black] font-bold z-10'
                  : hasWorkout
                    ? 'border-emerald-500/80 bg-emerald-950/20 text-emerald-400 hover:border-emerald-400 cursor-pointer'
                    : 'border-[#1a1a1a] bg-black/40 text-neutral-500 hover:border-[#333]'
              }`}
            >
              <span className="text-[10px] self-start font-bold">{cell.dayNumber}</span>
              {hasWorkout && (
                <Dumbbell
                  size={10}
                  className={`mt-0.5 ${isSelected ? 'text-[var(--primary)]' : 'text-emerald-400 animate-pulse'}`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Session Details Panel */}
      {selectedCell && (
        <div className="border border-[var(--primary)] bg-[var(--primary-glow)] p-3 rounded-xl flex flex-col gap-2.5 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-[var(--primary)]/20 pb-1.5">
            <span className="text-[10px] uppercase font-bold text-white tracking-wide">
              Logged on {selectedCell.dayNumber} {monthNames[month].substring(0, 3)}:
            </span>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-[9px] uppercase font-bold text-[var(--primary)] hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-[140px] overflow-y-auto">
            {selectedCell.sessionsList.map((sess, idx) => (
              <div key={idx} className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold uppercase">
                    Workout #{idx + 1}
                  </span>
                  <span className="text-[9px] font-mono bg-black/50 text-neutral-400 px-1.5 py-0.5 rounded border border-[#222]">
                    Volume: {sess.totalVolume || 0}kg
                  </span>
                </div>

                {/* Exercises short summary */}
                <div className="text-[10px] text-neutral-300 font-sans leading-relaxed pl-1.5 border-l border-[var(--primary)]/30">
                  {sess.exercises && sess.exercises.length > 0 ? (
                    sess.exercises.map((ex, exIdx) => (
                      <div key={exIdx} className="truncate">
                        • <span className="font-bold text-white">{ex.name}</span> ({ex.sets?.length || 0} sets)
                      </div>
                    ))
                  ) : (
                    <span className="text-neutral-500 italic">No movements recorded.</span>
                  )}
                </div>

                {/* Repeat Button (Mobile logger context only) */}
                {onSelectSession && (
                  <button
                    onClick={() => onSelectSession(sess)}
                    className="w-full mt-1.5 py-1.5 bg-[var(--primary)] text-black font-body font-bold text-[10px] uppercase rounded border border-black shadow-[2px_2px_0px_black] active:scale-95 cursor-pointer transition-all flex items-center justify-center gap-1"
                  >
                    <Flame size={10} className="fill-black" />
                    <span>⚡ Repeat Workout in Logger</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
};
