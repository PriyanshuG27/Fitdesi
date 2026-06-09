import fs from 'fs';
import path from 'path';

const exercisesPath = path.resolve('src/data/exercises.json');
const outputPath = path.resolve('src/data/strength_standards.json');

if (!fs.existsSync(exercisesPath)) {
  console.error('Exercises file not found at:', exercisesPath);
  process.exit(1);
}

const exercises = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));

// Base strength standards (ratios of 1RM to bodyweight)
const BASE_STANDARDS = {
  bench: [0.50, 0.75, 1.00, 1.30, 1.60],    // Beginner, Novice, Intermediate, Advanced, Elite
  squat: [0.60, 0.90, 1.25, 1.65, 2.10],
  deadlift: [0.70, 1.05, 1.45, 1.95, 2.40],
  ohp: [0.35, 0.50, 0.65, 0.85, 1.10],
  generic: [0.25, 0.40, 0.60, 0.85, 1.10]
};

const GENDER_FACTORS = {
  upper: 0.65, // Female upper body standard multiplier vs male
  lower: 0.80, // Female lower body/leg standard multiplier vs male
  core: 0.70   // Core/abs/default
};

const standardsDb = {};

exercises.forEach(ex => {
  const key = ex.key;
  const nameLower = ex.name.toLowerCase();
  const muscleLower = (ex.muscleGroup || 'chest').toLowerCase();

  // 1. Determine base category
  let category = 'generic';
  if (nameLower.includes('bench press') || nameLower.includes('chest press')) {
    category = 'bench';
  } else if (nameLower.includes('squat')) {
    category = 'squat';
  } else if (nameLower.includes('deadlift')) {
    category = 'deadlift';
  } else if (nameLower.includes('overhead press') || nameLower.includes('shoulder press') || nameLower.includes('ohp') || nameLower.includes('military press')) {
    category = 'ohp';
  }

  // Clone base standard
  let maleMultipliers = [...BASE_STANDARDS[category]];

  // 2. Apply Dumbbell / Isolation Modifier
  const isDumbbellOrIsolation = 
    nameLower.includes('dumbbell') || 
    nameLower.includes('db') || 
    nameLower.includes('kettlebell') || 
    nameLower.includes('kb') || 
    nameLower.includes('curl') || 
    nameLower.includes('extension') || 
    nameLower.includes('lateral') || 
    nameLower.includes('raise') || 
    nameLower.includes('fly') || 
    nameLower.includes('pullover') || 
    nameLower.includes('kickback') || 
    nameLower.includes('isolation') ||
    muscleLower === 'biceps' ||
    muscleLower === 'triceps' ||
    muscleLower === 'calves' ||
    muscleLower === 'forearms';

  if (isDumbbellOrIsolation) {
    // Halve the ratios to represent single-limb/single-dumbbell proportions
    maleMultipliers = maleMultipliers.map(val => val * 0.5);
  }

  // 3. Determine gender factor based on muscle group
  let genderFactor = GENDER_FACTORS.core;
  if (['chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'arms'].includes(muscleLower)) {
    genderFactor = GENDER_FACTORS.upper;
  } else if (['legs', 'glutes', 'quads', 'hamstrings', 'calves'].includes(muscleLower)) {
    genderFactor = GENDER_FACTORS.lower;
  }

  // 4. Calculate Female Multipliers
  const femaleMultipliers = maleMultipliers.map(val => val * genderFactor);

  // Helper to construct tier object
  const mapTiers = (arr) => ({
    beginner: Number(arr[0].toFixed(3)),
    novice: Number(arr[1].toFixed(3)),
    intermediate: Number(arr[2].toFixed(3)),
    advanced: Number(arr[3].toFixed(3)),
    elite: Number(arr[4].toFixed(3))
  });

  standardsDb[key] = {
    male: mapTiers(maleMultipliers),
    female: mapTiers(femaleMultipliers)
  };
});

// Write to local JSON file
fs.writeFileSync(outputPath, JSON.stringify(standardsDb, null, 2), 'utf8');
console.log(`Successfully generated strength standards database for ${Object.keys(standardsDb).length} exercises!`);
console.log(`Saved database to: ${outputPath}`);
