import exercises from '../data/exercises.json';

/**
 * Helper to check if an exercise is bodyweight-based
 */
const isBodyweight = (key) => {
  const bodyweightKeys = [
    'push_ups', 'pull_ups', 'dips', 'plank', 'hanging_leg_raise',
    'russian_twists', 'ab_wheel_rollouts', 'chin_ups', 'inverted_row',
    'bodyweight_squat', 'pistol_squat'
  ];
  return bodyweightKeys.includes(key);
};

/**
 * Parses natural language input to extract exercise details.
 * E.g., "bench press 60kg 3 sets of 10 reps"
 * Returns: { exerciseKey, name, muscleGroup, sets: [{ reps, weight, completed, done }] } or null
 */
export function parseWorkoutText(text) {
  if (!text || typeof text !== 'string') return null;
  
  const cleanedText = text.toLowerCase().trim();
  
  // 1. Extract Weight
  // Matches e.g. "60kg", "60.5 kg", "60.5kilograms", "at 60"
  let weight = null;
  
  const weightMarkerMatch = cleanedText.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|lbs|kilos|kilograms|pounds|kilo|pound)/i);
  if (weightMarkerMatch) {
    weight = parseFloat(weightMarkerMatch[1]);
  }
  
  // 2. Extract Sets and Reps
  let setsCount = 3; // default fallback
  let repsCount = 10; // default fallback
  
  // Look for pattern "3x10" or "3 x 10" or "3 * 10" or "3 sets of 10" or "3sets of 10" or "3sets 10reps"
  const xMatch = cleanedText.match(/(\d+)\s*(?:x|\*|by|sets?\s*of|sets?\s*\*\s*)\s*(\d+)/i);
  if (xMatch) {
    setsCount = parseInt(xMatch[1], 10);
    repsCount = parseInt(xMatch[2], 10);
  } else {
    // If not standard X match, look for "3 sets" and "10 reps" separately
    const setsMatch = cleanedText.match(/(\d+)\s*sets?/i);
    if (setsMatch) {
      setsCount = parseInt(setsMatch[1], 10);
    }
    const repsMatch = cleanedText.match(/(\d+)\s*(?:reps?|repetitions)/i);
    if (repsMatch) {
      repsCount = parseInt(repsMatch[1], 10);
    }
  }

  // If we couldn't find a weight with a marker, let's look for a leftover number that is NOT the sets or reps
  if (weight === null) {
    const allNumbers = cleanedText.match(/\b\d+(?:\.\d+)?\b/g);
    if (allNumbers) {
      const parsedNumbers = allNumbers.map(Number);
      let setsRemoved = false;
      let repsRemoved = false;
      
      const potentialWeights = parsedNumbers.filter((num) => {
        if (num === setsCount && !setsRemoved) {
          setsRemoved = true;
          return false;
        }
        if (num === repsCount && !repsRemoved) {
          repsRemoved = true;
          return false;
        }
        return true;
      });
      
      if (potentialWeights.length > 0) {
        weight = potentialWeights[0];
      }
    }
  }
  
  if (weight === null) {
    weight = 0;
  }
  
  // 3. Find Exercise
  // Strip numbers, markers (kg, sets, reps, x) to leave only the exercise name candidate
  const cleanExerciseQuery = cleanedText
    .replace(/\b\d+(?:\.\d+)?\b/g, '') // remove numbers
    .replace(/\b(?:kg|kgs|lbs|kilos|kilograms|pounds|kilo|pound|at|of|sets?|reps?|x|\*|by|repetitions)\b/gi, '') // remove keywords
    .replace(/[^\w\s-]/g, '') // remove punctuation
    .replace(/\s+/g, ' ') // collapse whitespaces
    .trim();
    
  if (cleanExerciseQuery.length < 2) return null;
  
  // Search through the local exercise bank
  let bestMatch = null;
  let highestScore = 0;
  
  for (const ex of exercises) {
    const nameLower = ex.name.toLowerCase();
    
    // Check direct equality
    if (nameLower === cleanExerciseQuery) {
      bestMatch = ex;
      break;
    }
    
    // Check substring match
    if (nameLower.includes(cleanExerciseQuery) || cleanExerciseQuery.includes(nameLower)) {
      const score = Math.min(cleanExerciseQuery.length, nameLower.length) / Math.max(cleanExerciseQuery.length, nameLower.length);
      if (score > highestScore) {
        highestScore = score;
        bestMatch = ex;
      }
    }
    
    // Check aliases
    if (ex.aliases) {
      for (const alias of ex.aliases) {
        const aliasLower = alias.toLowerCase();
        if (aliasLower === cleanExerciseQuery) {
          bestMatch = ex;
          highestScore = 1.0;
          break;
        }
        if (aliasLower.includes(cleanExerciseQuery) || cleanExerciseQuery.includes(aliasLower)) {
          const score = Math.min(cleanExerciseQuery.length, aliasLower.length) / Math.max(cleanExerciseQuery.length, aliasLower.length);
          if (score > highestScore) {
            highestScore = score;
            bestMatch = ex;
          }
        }
      }
    }
  }
  
  if (!bestMatch) {
    return null;
  }
  
  const isBW = isBodyweight(bestMatch.key);
  const resolvedWeight = (isBW && weight === 0) ? 'BW' : String(weight);
  
  const sets = Array.from({ length: setsCount }).map(() => ({
    reps: String(repsCount),
    weight: resolvedWeight,
    completed: false,
    done: false
  }));
  
  return {
    exerciseKey: bestMatch.key,
    name: bestMatch.name,
    muscleGroup: bestMatch.muscleGroup,
    sets
  };
}
