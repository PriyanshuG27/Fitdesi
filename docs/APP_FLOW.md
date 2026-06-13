# Zenkai — Application Flow & User Journeys

This document details the screen flows, state transitions, and user journeys across mobile and desktop views in Zenkai.

---

## 1. Authentication & Onboarding Flow

```
   [ App Launch ]
         │
         ▼
[ Auth State Checked ]
         │
         ├──► Not Authenticated ──► [ Landing Page ] ──► [ Login / Signup ]
         │                                                      │
         ▼                                                      ▼
[ Authenticated ] ────────────────────────────────────► [ Onboarding Check ]
                                                                │
                                                ┌───────────────┴───────────────┐
                                                ▼ (Incomplete)                  ▼ (Complete)
                                       [ Onboarding Steps ]            [ Dashboard / Home ]
                                        - User Type Selection
                                        - Equipment Checklist
                                        - Medical Flags
```

### 1.1 First-Time Signup & Onboarding
- **Sign Up**: User registers via Email/Password or Google OAuth.
- **Profile Initialization**: System creates a user profile document in Firestore.
- **Onboarding Steps**:
  1. **User Type**: Selects "comeback", "beginner", "consistent", or "challenger".
  2. **Equipment Checklist**: Multi-select of available equipment (Barbell, Dumbbells, etc.).
  3. **Medical Flags**: Toggles flags (e.g. "lower_back") to restrict injury-prone movements.
- **XP Burst**: Completing onboarding awards `+100 XP` and updates `onboardingComplete = true`.

---

## 2. Active Workout Logging Loop (Mobile-First)

```
[ Dashboard ] ──► [ Setup Screen ] ──► [ Active Logger ] ──► [ Summary Screen ]
                   - Stomach check      - Timer counting up     - PR Celebrations
                   - Mood tags          - Set entry check-off   - XP award display
                                        - Rest Timer audio
```

1. **Start Session**: User clicks "Start Workout" on the dashboard.
2. **Setup Screen**: Asks pre-workout questions:
   - *Stomach Check*: Feeling off or locked in?
   - *Mood Tag*: "locked_in", "average", or "low_energy".
3. **Active Logger**:
   - Displays exercises in the daily plan.
   - Users can search for and add exercises.
   - Checking off a set starts the circular rest timer (which schedules a server-side notification).
4. **Summary & PR celebration**:
   - Submitting calculates volume and checks for PRs.
   - Triggers level checks and displays XP rewards.

---

## 3. University Gym Scouting & Trading Matrix (Desktop)

```
[ Profile ] ──► Toggle "Looking for Squad" & Select "Home Gym ID"
                      │
                      ▼
[ Squads tab ] ──► [ Scouting Matrix Table ] ──► Click on Free Agent
                                                       │
                                                       ▼
                                             [ Scouting Radar Card ]
                                             - Strength / Volume / Consistency
                                             - Click "Draft / Send Invite"
                                                       │
                                             ┌─────────┴─────────┐
                                             ▼ (Under capacity)  ▼ (At capacity)
                                        [ Send Invite ]     [ Open Trade Modal ]
                                                             - Select member to release
                                                             - Release & Invite Agent
```

1. **Registration**: User selects their Home Gym (`gymId`) in their profile and toggles "Looking for Squad" to register as a Free Agent.
2. **Scouting Table**: Squad members view other gym members sorted by strength, volume, or consistency.
3. **Athlete Scouting Card**: Renders a Recharts Radar Chart plotting:
   - *Strength*: Bodyweight-relative compound lifts standard score.
   - *Volume*: Weekly volume index.
   - *Consistency*: 14-day training consistency.
   - *Level* & *Streak*: Scaled scores.
4. **Draft/Trade**:
   - If squad size $<$ limit: Sends a draft invitation (`squad_invites` state set to pending).
   - If squad is full: Prompts the user with a Trade Modal to select a member to release, updates the squad document, and sends the invitation.

---

## 4. PvE Titan Raid Boss Loop

```
  [ Squad Dashboard ] ──► Summon Titan Boss (costs keys, cooldown applies)
                                │
                                ▼
  [ Active Challenge ] ──► Lift volume targeting Titan's muscle weakness (1.5x damage)
                                │
                                ▼
  [ Titan Defeated ] ───► HP reaches 0. Squad wins Boss Keys & bonus multipliers
```

1. **Summoning**: Squad members summon a Titan Raid Boss using Boss Keys.
2. **Raid Active**: Displays a red Health Bar matching the Titan's HP (scaled by squad size and win streak).
3. **Weakness Multiplier**: The Titan has a muscle weakness (e.g. `LEGS`). Workout sets targeting this group deal **1.5x damage** (volume translated to damage) to the Titan.
4. **Victory**: Reducing HP to 0 defeats the Titan, granting rewards (Boss Keys, XP multipliers) and updating the win streak.

---

## 5. Shared Squad Presence & Scheduling Polls

- **Presence Check-In**:
  - Squad members select their target gym arrival time (e.g. `17:30`) or mark a rest day ("Not Going").
  - Checking in sends a push notification to teammates.
  - A background scheduler sends workout reminders 1 hour before the checked-in time.
- **Scheduling Polls**:
  - Members create polls with multiple options (e.g. *"What time are we training tomorrow?"*).
  - Teammates vote on options, updating check-in selections.

---

## 6. Academic Exam Buffer Flow (Desktop)

1. **Selection**: User goes to Profile $\rightarrow$ Academic Buffer Panel.
2. **Setup**: Highlights exam weeks on the calendar.
3. **Activation**:
   - Automatically deloads routine volumes to **1/9th of normal** during exam weeks.
   - Toggles streak protection rules to prevent streak resets during academic windows.

---

## 7. Sunday AI Magazine & Newspaper Layout

1. **Weekly Compilation**: On Sundays, the app compiles the past 7 days of training metrics.
2. ** AI Processing**: Calls the Express API to summarize the data into a newspaper layout.
3. **Reprints**:
   - Issue is cached in Firestore under `/users/{uid}/weekly_magazines`.
   - Users are restricted to 1 weekly reprint attempt.
4. **Easter Egg**: Users locate the promo code `ZK-SYNERGY-2026` in the Classifieds section to redeem in the Squad Matchmaker.

---

## 8. Poster Studio & Canvas Exports

1. **Stage Hydration**: Loads the user's weekly achievements onto a Canvas layout (`react-konva`).
2. **Stickers**: Drag, scale, and rotate neubrutalist milestone badges.
3. **Exporting**:
   - High-res render is compiled into a base64 string.
   - Uploads to Firebase Storage and generates a public URL.
   - Encodes the URL into a QR Code. Teammates can scan the QR code to view and download the poster.
