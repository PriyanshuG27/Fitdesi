import React from 'react';
import { Trophy, Award, Zap, Shield } from 'lucide-react';

export const TrophyCabinetView = () => {
  const achievements = [
    {
      id: 'phoenix',
      title: 'PHOENIX RISE',
      desc: 'Completed the 6-week comeback protocol successfully.',
      icon: <Shield className="text-[var(--primary)]" size={20} />,
      unlocked: true
    },
    {
      id: 'sattu',
      title: 'SATTU CHARGER',
      desc: 'Hit protein macros for 14 consecutive days.',
      icon: <Zap className="text-[var(--accent-xp)]" size={20} />,
      unlocked: true
    },
    {
      id: 'bench100',
      title: 'CENTURY CLUB',
      desc: 'Logged a 100kg Bench Press working set.',
      icon: <Trophy className="text-[var(--secondary)]" size={20} />,
      unlocked: true
    },
    {
      id: 'streak90',
      title: 'CONSISTENCY ELITE',
      desc: 'Unlocked at 90 days streak milestone.',
      icon: <Award className="text-[#555]" size={20} />,
      unlocked: false
    }
  ];

  return (
    <div className="border-2 border-black bg-[var(--surface)] p-6 rounded-2xl shadow-[5px_5px_0px_rgba(0,0,0,1)] flex flex-col gap-4 text-left">
      <div className="border-b border-[var(--border)] pb-2 flex justify-between items-center">
        <h3 className="font-display font-black text-lg text-white uppercase tracking-tight flex items-center gap-2">
          <Trophy className="text-[var(--primary)]" size={18} />
          <span>Trophy Cabinet</span>
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
        {achievements.map((ach) => (
          <div
            key={ach.id}
            className={`border-2 border-black bg-[#111] p-4 rounded-xl flex items-start gap-3 shadow-[3px_3px_0px_black] relative overflow-hidden transition-all hover:scale-[1.02] ${
              !ach.unlocked ? 'opacity-40 select-none grayscale' : ''
            }`}
          >
            {/* Background pattern */}
            <div className="absolute right-0 bottom-0 text-white/5 font-display text-4xl font-extrabold select-none pointer-events-none">
              FIT
            </div>

            <div className="bg-black border border-[#222] p-2.5 rounded-lg">
              {ach.icon}
            </div>

            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-mono font-black text-white uppercase tracking-wider">
                {ach.title}
              </span>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed font-sans">
                {ach.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
