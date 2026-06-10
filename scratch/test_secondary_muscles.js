import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exercisesPath = path.join(__dirname, '..', 'src', 'data', 'exercises.json');
const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));

// Replicate logic of getSecondaryMuscles
function getSecondaryMuscles(exerciseKey, category) {
  const name = (exerciseKey || '').toLowerCase();
  const secondaries = [];

  if (category === 'chest') {
    if (name.includes('press') || name.includes('pushup') || name.includes('push_up') || name.includes('dip')) {
      secondaries.push({ muscle: 'triceps', category: 'arms', weight: 0.3 });
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.3 });
    } else if (name.includes('fly') || name.includes('crossover') || name.includes('pec_deck') || name.includes('pec deck')) {
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.2 });
    }
  } else if (category === 'shoulders') {
    if (name.includes('press') || name.includes('ohp') || name.includes('military') || name.includes('arnold')) {
      secondaries.push({ muscle: 'triceps', category: 'arms', weight: 0.3 });
    } else if (name.includes('row') || name.includes('upright') || name.includes('face_pull') || name.includes('face pull')) {
      secondaries.push({ muscle: 'biceps', category: 'arms', weight: 0.2 });
      secondaries.push({ muscle: 'lats', category: 'back', weight: 0.2 });
    }
  } else if (category === 'back') {
    if (name.includes('pull') || name.includes('chin') || name.includes('row') || name.includes('lat') || name.includes('pulldown')) {
      secondaries.push({ muscle: 'biceps', category: 'arms', weight: 0.3 });
    }
    if (name.includes('deadlift') || name.includes('extension') || name.includes('good_morning') || name.includes('good morning')) {
      secondaries.push({ muscle: 'glutes', category: 'legs', weight: 0.3 });
      secondaries.push({ muscle: 'hamstrings', category: 'legs', weight: 0.3 });
    }
  } else if (category === 'legs') {
    if (name.includes('squat') || name.includes('press') || name.includes('hack') || name.includes('lunge') || name.includes('step') || name.includes('split') || name.includes('thruster')) {
      secondaries.push({ muscle: 'glutes', category: 'legs', weight: 0.3 });
      secondaries.push({ muscle: 'hamstrings', category: 'legs', weight: 0.3 });
      if (name.includes('lunge') || name.includes('split') || name.includes('step')) {
        secondaries.push({ muscle: 'calves', category: 'legs', weight: 0.1 });
      }
    }
  } else if (category === 'arms') {
    if (name.includes('press') || name.includes('dip')) {
      secondaries.push({ muscle: 'chest', category: 'chest', weight: 0.3 });
      secondaries.push({ muscle: 'shoulders', category: 'shoulders', weight: 0.3 });
    }
  }

  return secondaries;
}

const results = [];
exercises.forEach(ex => {
  const muscle = (ex.muscleGroup || '').toLowerCase();
  let category = null;

  if      (muscle.includes('chest') || muscle.includes('pectoral'))                                                       category = 'chest';
  else if (muscle.includes('back')  || muscle.includes('lats') || muscle.includes('traps'))                               category = 'back';
  else if (muscle.includes('shoulder') || muscle.includes('deltoid'))                                                     category = 'shoulders';
  else if (muscle.includes('arm') || muscle.includes('bicep') || muscle.includes('tricep') || muscle.includes('forearm')) category = 'arms';
  else if (muscle.includes('leg') || muscle.includes('quad') || muscle.includes('hamstring') || muscle.includes('calf') || muscle.includes('glute')) category = 'legs';
  else if (muscle.includes('core') || muscle.includes('abs') || muscle.includes('abdominal'))                            category = 'core';
  else if (muscle.includes('stretching'))                                                                                 category = 'stretching';

  if (!category) {
    results.push({ name: ex.name, key: ex.key, category: 'N/A', secondaries: [] });
    return;
  }

  const secs = getSecondaryMuscles(ex.key, category);
  results.push({ name: ex.name, key: ex.key, category, secondaries: secs });
});

const withSecs = results.filter(r => r.secondaries.length > 0);
const withoutSecs = results.filter(r => r.secondaries.length === 0 && r.category !== 'stretching');

console.log(`Exercises with secondary muscles: ${withSecs.length}`);
console.log(`Exercises without secondary muscles (excluding stretching): ${withoutSecs.length}`);

console.log('\n--- SAMPLES WITH SECONDARY ---');
withSecs.slice(0, 15).forEach(r => {
  console.log(`${r.name} (${r.category}) -> ${r.secondaries.map(s => `${s.muscle} (${s.weight})`).join(', ')}`);
});

console.log('\n--- SAMPLES WITHOUT SECONDARY ---');
withoutSecs.slice(0, 30).forEach(r => {
  console.log(`${r.name} (${r.category}) [key: ${r.key}]`);
});
