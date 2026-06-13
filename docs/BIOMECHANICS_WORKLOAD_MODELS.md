# Zenkai — Biomechanics & Workload Models

This document details the sports science mathematical models, workload calculators, fatigue mapping, and client-side Natural Language Processing (NLP) routines that drive Zenkai's training analytics.

---

## 1. Effective Bodyweight Load Model

Standard gym trackers treat bodyweight (BW) exercises as having zero weight or raw reps, ignoring their volume contribution. Zenkai applies biomechanical research multipliers to calculate the mechanical load of bodyweight movements.

### 1.1 Biomechanical Multipliers (`bwEffectiveLoad.js`)
Multipliers are derived from published peer-reviewed force plate and center-of-mass kinematics studies:
- **Push-ups (Standard/Diamond/Archer)**: `0.64` of total bodyweight (Suprak et al., 2011).
- **Push-ups (Wide Grip)**: `0.69` of total bodyweight.
- **Push-ups (Incline)**: `0.53` (due to angle unloading).
- **Push-ups (Decline)**: `0.74` (due to angle loading).
- **Handstand Push-ups**: `1.00` (full bodyweight handled overhead).
- **Chest/Tricep Dips**: `0.75` (accounts for suspended mass excluding forearm/hand segment).
- **Pull-ups / Chin-ups / Muscle-ups**: `1.00` (suspending full bodyweight against gravity).
- **Inverted / Australian Rows**: `0.70`.
- **Squats / Lunges / Step-ups**: `0.85` (Fortenbaugh et al. reaction data; torso/thigh mass above knee).
- **Plank / Side Plank**: `0.69` (Winter center-of-mass pivot analysis).
- **Hanging Leg Raise**: `0.20` (mass of lower limb segments).
- **Hanging Knee Raise**: `0.15`.
- **Dragon Flag**: `0.80` (requires high core torque, nearly full bodyweight acting as a lever).
- **Glute Bridge**: `0.50`.

### 1.2 Pattern-Matching Fallbacks
If an exercise is not in the exact key registry, Zenkai uses regex patterns checked sequentially:
- `*pull_up*` or `*chin_up*` $\rightarrow$ `1.00`
- `*push_up*` $\rightarrow$ `0.64`
- `*dip*` $\rightarrow$ `0.75`
- `*plank*` $\rightarrow$ `0.69`
- `*squat*` or `*lunge*` $\rightarrow$ `0.85`
- `*bridge*` or `*thrust*` $\rightarrow$ `0.50`

---

## 2. EWMA-ACWR Muscle Fatigue Engine

Zenkai tracks localized muscle-group soreness using the Exponentially Weighted Moving Average (EWMA) to calculate the Acute:Chronic Workload Ratio (ACWR).

### 2.1 Why EWMA?
Simple averages treat a workout from 4 weeks ago the same as a workout logged yesterday. EWMA decays older sessions exponentially, matching how the human body actually recovers and adapts (Hulin et al., 2016).

### 2.2 Mathematical Model
Workloads are updated day-by-day over a 28-day window:
- **Acute Workload**: 7-day window. Decay constant:
  $$\lambda_a = \frac{2}{7 + 1} = 0.25$$
- **Chronic Workload**: 28-day window. Decay constant:
  $$\lambda_c = \frac{2}{28 + 1} \approx 0.0689$$

For each day $t$:

$$\text{EWMA}_{\text{acute}}(t) = \text{Volume}(t) \times \lambda_a + (1 - \lambda_a) \times \text{EWMA}_{\text{acute}}(t-1)$$

$$\text{EWMA}_{\text{chronic}}(t) = \text{Volume}(t) \times \lambda_c + (1 - \lambda_c) \times \text{EWMA}_{\text{chronic}}(t-1)$$

$$\text{ACWR}(t) = \frac{\text{EWMA}_{\text{acute}}(t)}{\text{EWMA}_{\text{chronic}}(t)}$$

### 2.3 Volume Load Calculation
- For weighted sets:
  $$\text{Volume} = \text{Weight (kg)} \times \text{Reps}$$
- For bodyweight sets:
  $$\text{Volume} = \text{Bodyweight (kg)} \times \text{Biomechanical Multiplier} \times \text{Reps}$$

### 2.4 Soreness and Fatigue Categories
The ACWR is scaled to a `0–150` fatigue index displayed on the interactive muscle model:
- **ACWR < 0.8** (Under-training) $\rightarrow$ **Recovered** (Score `< 30`, Neon Green).
- **ACWR 0.8–1.3** (Sweet Spot) $\rightarrow$ **Optimal Stimulus** (Score `30–100`, Neon Yellow).
- **ACWR > 1.3** (Overreaching/Danger) $\rightarrow$ **Heavy Fatigue** (Score `> 100`, Neon Red).

---

## 3. Strength Standards & 1-Rep Max

Zenkai maps strength ratios against universal standards.

### 3.1 1-Rep Max Estimation
1RM is calculated using Epley's formula (for reps $> 1$):

$$\text{1RM} = \text{Weight} \times \left(1 + \frac{\text{Reps}}{30}\right)$$

For 1 rep, estimated 1RM is equal to the raw weight.

### 3.2 Muscle Mappings
The system maps 14 individual muscles to 6 general groups:

```javascript
export const MUSCLE_TO_CATEGORY = {
  chest: 'chest', shoulders: 'shoulders',
  biceps: 'arms', triceps: 'arms', forearms: 'arms',
  abs: 'core', obliques: 'core',
  quads: 'legs', hamstrings: 'legs', calves: 'legs', glutes: 'legs',
  traps: 'back', lats: 'back', lower_back: 'back'
};
```

### 3.3 Demographic Adjustments
User weight, gender, and age adjust the strength standards:
- Compound lifts (bench press, squats, deadlifts, overhead presses) use specific bodyweight ratio multipliers.
- Dumbbell or single-arm movements are automatically scaled down by 50% to prevent incorrect standard inflation.

---

## 4. Client NLP Quick-Log Parser

To allow fast entry, Zenkai includes a regex-based Natural Language Processing (NLP) parser (`nlpParser.js`).

### 4.1 Parser Execution Flow
1. **Weight Extraction**: Matches expressions like `60kg`, `60.5 kg`, `at 60`, or `135lbs` and parses the decimal.
2. **Sets & Reps Extraction**: Matches patterns like `3x10`, `3 x 10`, `3 sets of 10`, or `3sets 10reps`.
3. **Leftover Numbers**: If no weight suffix is found, it filters out parsed sets/reps and treats any remaining number as the weight.
4. **Exercise Identification**:
   - Strips numbers, units, and punctuation.
   - Cleans the string to isolate the query name (e.g., *"bench press"*).
   - Iterates through the local exercises catalog, computing a match score:
     - Exact match on key or name: high score.
     - Substring match on aliases: partial score.
   - Selects the exercise with the highest score above the minimum threshold.
