# Zenkai — Technical Requirements Document (TRD)

**Version:** 1.0  
**Date:** June 2026  
**Status:** Approved for Build  

---

## 1. Stack

| Layer | Decision | Rationale |
|---|---|---|
| Framework | React (Vite) | No SSR needed; Vite HMR is fast; lighter than Next.js for this use case |
| Styling | Tailwind CSS v3 | Utility-first, responsive breakpoints, no runtime CSS |
| State | Zustand | Scoped stores, minimal re-renders, zero boilerplate vs Context |
| Charts | Recharts | Declarative, React-native, sufficient for line + bar charts |
| Animations | Framer Motion | Declarative, performant, excellent for page transitions + celebrations |
| Icons | Lucide React | Consistent stroke weight, tree-shakeable |
| Auth | Firebase Auth | Google OAuth + email/password, persistent session |
| Database | Cloud Firestore | Document model matches feature data, real-time listeners built-in |
| Backend / AI | Firebase Cloud Functions | Gemini key stays server-side, callable from client with auth context |
| AI | Gemini Flash (gemini-1.5-flash) | Fast, cheap, sufficient for JSON plan generation |
| Deployment | Vercel | CI/CD from GitHub, instant preview URLs, zero config |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React/Vite)                  │
│                                                         │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐  │
│  │  MobileApp  │   │  DesktopApp │   │   Zustand    │  │
│  │  Component  │   │  Component  │   │   Stores     │  │
│  │    Tree     │   │    Tree     │   │              │  │
│  └──────┬──────┘   └──────┬──────┘   └──────┬───────┘  │
│         └────────┬─────────┘                │           │
│               Shared Hooks ◄────────────────┘           │
│         (useAuth, useWorkoutLogger, etc.)                │
└──────────────┬──────────────────────────────────────────┘
               │
       ┌───────┴────────────────────────────┐
       │                                    │
┌──────▼──────┐                   ┌─────────▼──────────┐
│  Firestore  │                   │  Cloud Functions   │
│  (client    │                   │  (Node.js 20)      │
│   SDK)      │                   │                    │
│             │                   │  generatePlan()    │
│  Direct R/W │                   │    ↓               │
│  from hooks │                   │  Reads sessions    │
└─────────────┘                   │  Reads profile     │
                                  │  Builds prompt     │
                                  │  Calls Gemini API  │
                                  │  Writes plan doc   │
                                  │  Returns success   │
                                  └────────────────────┘
```

**Key decision:** Firestore is accessed directly from the client SDK for all CRUD operations. Cloud Functions are only used for AI plan generation (Gemini key isolation) and any future server-side operations. This keeps latency low for logging operations.

---

## 3. Frontend Architecture

### 3.1 Device Detection + Routing

```javascript
// hooks/useDeviceLayout.js
const useDeviceLayout = () => {
  const [layout, setLayout] = useState(
    window.innerWidth >= 768 ? 'desktop' : 'mobile'
  );
  
  useEffect(() => {
    const handler = () =>
      setLayout(window.innerWidth >= 768 ? 'desktop' : 'mobile');
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  
  return layout;
};

// App.jsx
const App = () => {
  const layout = useDeviceLayout();
  return layout === 'mobile' ? <MobileApp /> : <DesktopApp />;
};
```

Breakpoint: **768px**. Below = mobile tree. Above = desktop tree.

### 3.2 Component Tree

```
App
├── AuthProvider (Firebase context)
├── useDeviceLayout()
│
├── [mobile] MobileApp
│   ├── MobileLanding
│   ├── MobileAuth (Login / Signup)
│   ├── MobileOnboarding
│   │   ├── UserTypeScreen
│   │   ├── EquipmentScreen
│   │   └── MedicalScreen
│   ├── MobileHome
│   │   ├── TodaysMissionCard
│   │   ├── XPBar
│   │   └── StreakBadge
│   ├── MobileLogger
│   │   ├── ExerciseSearch
│   │   ├── SetRow (reps + weight + complete btn)
│   │   ├── MoodSelector
│   │   └── SessionCompleteScreen
│   ├── MobileProgress
│   │   ├── StrengthChart
│   │   ├── VolumeChart
│   │   └── PRList
│   ├── MobilePlan
│   ├── MobileChallenges
│   ├── MobileProfile
│   └── BottomNav
│
└── [desktop] DesktopApp
    ├── DesktopLanding
    ├── DesktopAuth
    ├── DesktopOnboarding
    ├── DesktopSidebar
    ├── DesktopDashboard
    │   ├── TodaysMissionCard
    │   ├── RecentSessionsList
    │   ├── WeeklyVolumeChart
    │   └── CurrentPlanPreview
    ├── DesktopLoggerPanel (slide-in panel)
    │   ├── ExerciseSearch
    │   └── SetTable
    ├── DesktopProgress
    │   ├── StrengthChartFull
    │   ├── VolumeChartFull
    │   └── PRTable
    ├── DesktopPlan
    ├── DesktopChallenges
    └── DesktopProfile
```

**Shared:** ExerciseSearch, SetRow/SetTable, StrengthChart, VolumeChart, PRList, TodaysMissionCard — these are layout-agnostic and used in both trees.

### 3.3 Custom Hooks

All business logic lives in hooks. Components are pure UI. Both component trees call the same hooks.

| Hook | Inputs | Returns | Side Effects |
|---|---|---|---|
| `useAuth` | — | `{ user, uid, loading, login, logout, signUp }` | Firebase Auth listener |
| `useDeviceLayout` | — | `'mobile' \| 'desktop'` | Resize listener |
| `useOnboarding` | — | `{ step, setUserType, setEquipment, setMedical, skip, complete }` | Writes to Firestore on complete |
| `useWorkoutLogger` | — | `{ session, addExercise, addSet, removeSet, finishSession, isActive }` | Writes session to Firestore |
| `usePRDetection` | `exerciseId, newSet` | `{ isPR, prevPR }` | Reads from `prs/`, writes if PR broken |
| `useXPEngine` | — | `{ xp, level, streak, awardXP }` | Reads/writes user doc |
| `useProgress` | `exerciseId?` | `{ strengthData, volumeData, prs, loading }` | Reads sessions subcollection |
| `useWeeklyPlan` | — | `{ plan, loading, generatePlan }` | Calls Cloud Function, reads weeklyPlans |
| `useChallenges` | — | `{ active, progress, startChallenge, updateProgress }` | Reads/writes challenges collection |
| `useWeeklyRecap` | — | `{ recap, isRecapDay }` | Reads last 7 days of sessions |

### 3.4 Zustand Stores

```javascript
// stores/authStore.js
{ user: null, uid: null, loading: true }

// stores/sessionStore.js
{
  isActive: false,
  startTime: null,
  moodTag: null,
  stomachFlag: false,
  exercises: [],          // [{ id, name, sets: [{ reps, weight, done }] }]
  currentExerciseId: null
}

// stores/xpStore.js
{
  xp: 0,
  level: 1,
  levelName: 'Rookie',
  streak: 0,
  streakLastDate: null
}

// stores/planStore.js
{
  currentPlan: null,      // { weekId, generatedAt, days: [...] }
  loading: false,
  error: null
}

// stores/challengeStore.js
{
  activeChallenges: [],
  progress: {}
}
```

---

## 4. Cloud Functions

### 4.1 `generatePlan` (HTTP Callable)

**Trigger:** Client calls `httpsCallable(functions, 'generatePlan')`  
**Auth:** Firebase verifies `context.auth.uid` — rejects unauthenticated calls.

**Server-side logic:**
1. Read last 14 sessions from `users/{uid}/sessions` ordered by date desc.
2. Read user profile: `equipmentList`, `medicalFlags`, `userType`.
3. Build Gemini prompt (see Section 6).
4. Call Gemini Flash via `@google/generative-ai` SDK.
5. Parse JSON response — validate structure.
6. Write to `users/{uid}/weeklyPlans/{weekId}`.
7. Return `{ success: true, weekId }`.

**Error handling:**
- Gemini parse failure → return `{ success: false, error: 'plan_parse_failed' }` — client shows "Try again" UI.
- Missing data (no sessions yet) → generate a beginner plan based on userType + equipment only.

### 4.2 `updateStreakOnLogin` (Firestore Trigger — Post-MVP)

Triggered on user document update. Checks if `streakLastDate` is yesterday — if not, streak resets to 0. MVP handles this client-side in `useXPEngine`.

---

## 5. Routing

Using `react-router-dom` v6.

```
/                     → Landing
/login                → Login
/signup               → Signup
/onboarding/*         → Onboarding steps (protected, redirect if already onboarded)
/home                 → Home (protected)
/workout              → Active logger (protected)
/workout/complete     → Session complete (protected)
/progress             → Progress dashboard (protected)
/plan                 → Weekly plan (protected)
/challenges           → Challenges hub (protected)
/profile              → Profile + settings (protected)
```

**Protected route wrapper:** Checks `authStore.user`. If null and loading is false → redirect to `/login`.

---

## 6. Gemini Prompt Template

```
You are a fitness coach generating a structured weekly workout plan for an Indian gym user.

USER PROFILE:
- Type: {userType}
- Equipment available: {equipmentList}
- Medical restrictions: {medicalFlags}

RECENT TRAINING DATA (last 14 sessions):
{sessionsJSON}
(includes: date, exercises, sets, reps, weights, mood tags, stomach flags)

INSTRUCTIONS:
1. Generate a 6-day weekly plan. Day 7 is rest.
2. Never include exercises that stress medically restricted areas.
3. Only use exercises achievable with the listed equipment.
4. Base weights on the user's recent logged weights — target 2.5–5% progression.
5. If stomach/fatigue flags appeared in recent sessions, reduce overall volume by 15%.
6. If userType is "Comeback", start at 70% of recent logged weights.

Respond ONLY with valid JSON matching this schema:
{
  "days": [
    {
      "day": 1,
      "focus": "Push",
      "exercises": [
        {
          "name": "Barbell Bench Press",
          "sets": 4,
          "reps": "8-10",
          "targetWeight": 60
        }
      ]
    }
  ]
}

No explanation. No markdown. Pure JSON only.
```

---

## 7. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // User document — only owner can read/write
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      // Sessions subcollection
      match /sessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;

        match /exercises/{exerciseId} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
        }
      }

      // Other subcollections — same rule
      match /{subcollection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    // Challenges — participant can read, creator can write, participants update own progress
    match /challenges/{challengeId} {
      allow read: if request.auth != null &&
        request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        request.auth.uid in resource.data.participants;
    }
  }
}
```

---

## 8. Firestore Indexes Required

| Collection | Fields | Order |
|---|---|---|
| `users/{uid}/sessions` | `date` | DESC |
| `users/{uid}/sessions` | `date`, `xpEarned` | DESC |
| `users/{uid}/xpLog` | `timestamp` | DESC |
| `challenges` | `participants`, `startDate` | — |

---

## 9. Environment Variables

```bash
# .env (local)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Firebase Functions environment (set via firebase functions:config:set)
GEMINI_API_KEY=
```

Gemini key is **never** in `.env` for the client. Only set in Cloud Functions config.

---

## 10. Performance Targets

| Metric | Target |
|---|---|
| Initial page load (LCP) | < 2.0s on 4G |
| Time to interactive | < 3.0s |
| Set logging tap → Firestore write | < 500ms |
| Plan generation (Cloud Function cold) | < 8s |
| Plan generation (warm) | < 3s |
| Chart render (30 data points) | < 100ms |

**Optimisations:**
- Code split by route: `React.lazy()` + `Suspense` on all page components.
- Recharts only loaded on `/progress` route.
- Framer Motion animations use `will-change: transform` — no layout thrashing.
- Firestore reads use `onSnapshot` listeners only where real-time is needed (home XP bar, active challenges). Everything else is one-time `getDocs`.

---

## 11. Dev Setup

```bash
# 1. Clone + install
git clone https://github.com/{username}/zenkai
cd zenkai
npm install

# 2. Firebase project
# Create project at console.firebase.google.com
# Enable: Auth (email + Google), Firestore, Functions
# Copy config to .env

# 3. Firebase CLI
npm install -g firebase-tools
firebase login
firebase init (select: Functions, Firestore, Emulators)

# 4. Run local with emulators
firebase emulators:start
npm run dev

# 5. Deploy
vercel --prod
firebase deploy --only functions
```

**Node version:** 20 (LTS) — required by Firebase Functions Gen 2.
