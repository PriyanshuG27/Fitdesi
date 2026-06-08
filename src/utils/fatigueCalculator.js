import { getIndividualMuscle } from './strengthCalculator';

export function calculateMuscleFatigue(sessions = []) {
  const now = Date.now();
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  
  const acuteCutoff = now - 3 * MS_PER_DAY;  // 72 hours
  const chronicCutoff = now - 30 * MS_PER_DAY; // 30 days

  const generalGroups = ['chest', 'back', 'shoulders', 'arms', 'legs', 'core'];
  const individualGroups = [
    'chest', 'traps', 'lats', 'lower_back', 'shoulders', 
    'biceps', 'triceps', 'forearms', 'abs', 'obliques', 
    'quads', 'hamstrings', 'glutes', 'calves'
  ];
  
  const generalAcuteSets = {};
  const generalChronicSets = {};
  const individualAcuteSets = {};
  const individualChronicSets = {};
  
  generalGroups.forEach((m) => {
    generalAcuteSets[m] = 0;
    generalChronicSets[m] = 0;
  });

  individualGroups.forEach((m) => {
    individualAcuteSets[m] = 0;
    individualChronicSets[m] = 0;
  });

  // Filter sessions in the last 30 days
  const recentSessions = sessions.filter((s) => {
    const sTime = s.date?.toDate ? s.date.toDate().getTime() : new Date(s.date || s.dateString).getTime();
    return sTime >= chronicCutoff && sTime <= now;
  });

  recentSessions.forEach((s) => {
    const sTime = s.date?.toDate ? s.date.toDate().getTime() : new Date(s.date || s.dateString).getTime();
    const isAcute = sTime >= acuteCutoff;

    const sessionExercises = s.exercises || [];
    sessionExercises.forEach((ex) => {
      const muscle = (ex.muscleGroup || '').toLowerCase();
      let category = null;
      if (muscle.includes('chest') || muscle.includes('pectoral')) category = 'chest';
      else if (muscle.includes('back') || muscle.includes('lats') || muscle.includes('traps')) category = 'back';
      else if (muscle.includes('shoulder') || muscle.includes('deltoid')) category = 'shoulders';
      else if (muscle.includes('arm') || muscle.includes('bicep') || muscle.includes('tricep') || muscle.includes('forearm')) category = 'arms';
      else if (muscle.includes('leg') || muscle.includes('quad') || muscle.includes('hamstring') || muscle.includes('calf') || muscle.includes('glute')) category = 'legs';
      else if (muscle.includes('core') || muscle.includes('abs') || muscle.includes('abdominal')) category = 'core';

      if (category) {
        const completedSetsCount = (ex.sets || []).filter((set) => set.done || set.completed).length;
        
        // Accumulate General Groups
        generalChronicSets[category] += completedSetsCount;
        if (isAcute) {
          generalAcuteSets[category] += completedSetsCount;
        }

        // Accumulate Individual Muscles
        const exKey = ex.exerciseKey || ex.key || '';
        const indivGroup = getIndividualMuscle(exKey, category);
        if (indivGroup && individualChronicSets[indivGroup] !== undefined) {
          individualChronicSets[indivGroup] += completedSetsCount;
          if (isAcute) {
            individualAcuteSets[indivGroup] += completedSetsCount;
          }
        }
      }
    });
  });

  // Calculate fatigue ratios
  const generalFatigue = {};
  generalGroups.forEach((m) => {
    const chronicAvg3Days = Math.max(4, (generalChronicSets[m] / 30) * 3);
    const acuteVol = generalAcuteSets[m];
    const ratio = (acuteVol / chronicAvg3Days) * 100;
    generalFatigue[m] = Math.min(150, Math.round(ratio));
  });

  const individualFatigue = {};
  individualGroups.forEach((m) => {
    const chronicAvg3Days = Math.max(2, (individualChronicSets[m] / 30) * 3);
    const acuteVol = individualAcuteSets[m];
    const ratio = (acuteVol / chronicAvg3Days) * 100;
    individualFatigue[m] = Math.min(150, Math.round(ratio));
  });

  const detailedFatigue = {
    chest_left: individualFatigue.chest,
    chest_right: individualFatigue.chest,
    front_delts_left: individualFatigue.shoulders,
    front_delts_right: individualFatigue.shoulders,
    biceps_left: individualFatigue.biceps,
    biceps_right: 	individualFatigue.biceps,
    forearm_left: individualFatigue.forearms,
    forearm_right: individualFatigue.forearms,
    abs: individualFatigue.abs,
    obliques_left: individualFatigue.obliques,
    obliques_right: individualFatigue.obliques,
    quads_left: individualFatigue.quads,
    quads_right: individualFatigue.quads,
    calves_left_front: individualFatigue.calves,
    calves_right_front: individualFatigue.calves,
    tibialis_left: individualFatigue.calves,
    tibialis_right: individualFatigue.calves,
    traps: individualFatigue.traps,
    lats_left: individualFatigue.lats,
    lats_right: individualFatigue.lats,
    rear_delts_left: individualFatigue.shoulders,
    rear_delts_right: individualFatigue.shoulders,
    triceps_left: individualFatigue.triceps,
    triceps_right: individualFatigue.triceps,
    lower_back: individualFatigue.lower_back,
    glutes_left: individualFatigue.glutes,
    glutes_right: individualFatigue.glutes,
    hamstrings_left: individualFatigue.hamstrings,
    hamstrings_right: individualFatigue.hamstrings,
    calves_left_back: individualFatigue.calves,
    calves_right_back: individualFatigue.calves
  };

  return {
    general: generalFatigue,
    detailed: detailedFatigue,
    individual: individualFatigue
  };
}
