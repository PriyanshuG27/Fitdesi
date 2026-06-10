import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, '..', 'src', 'data', 'exercises.json');
const exercises = JSON.parse(fs.readFileSync(filePath, 'utf8'));

console.log(`Total exercises: ${exercises.length}`);

const groups = {};
exercises.forEach(ex => {
  const mg = ex.muscleGroup || 'unknown';
  if (!groups[mg]) groups[mg] = [];
  groups[mg].push(ex.name);
});

Object.keys(groups).forEach(mg => {
  console.log(`\nMuscle Group: ${mg} (${groups[mg].length} exercises)`);
  console.log(groups[mg].slice(0, 15).join(', ') + (groups[mg].length > 15 ? '...' : ''));
});
