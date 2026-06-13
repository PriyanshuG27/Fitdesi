# Zenkai — Gamification & Rewards Engine

This document details the mechanics, formulas, data structures, and APIs that power Zenkai's gamification system, consistency streaks, power-ups, loot boxes, and social reward transactions.

---

## 1. XP Engine & Leveling

The XP Engine rewards consistency, focus, and progression. It calculates XP increases on session completion, logs them to the audit log, and manages level transitions.

### 1.1 XP Accumulation Sources
XP is awarded for actions logged in the system:
- **Onboarding Completion**: `+100 XP` (one-time).
- **Session Logged (Standard)**: `+100 XP` per workout.
- **Intensity Bonus**: `+150 XP` if the session's average RPE $\ge 8$.
- **Focus Bonus**: `+150 XP` if the session's average Mind-Muscle Connection (MMC) $\ge 8$.
- **PR Broken**: `+10 XP` (or `+12 XP` with Adrenaline Rush passive).
- **Weekly Synergy Challenge Contribution**: XP based on Titan damage (1.5x multiplier for targeting muscle weaknesses).
- **Newspaper Easter Egg Promo**: `+25 XP` (one-time).
- **Streak Milestones**: Special XP grants for hitting consistency goals.

### 1.2 Level-Up Mechanics
Zenkai uses a dual approach to manage levels:

1. **Calculated Level Formula**: The backend uses a continuous quadratic progression for chest openings:
   $$\text{level} = \lfloor \sqrt{\text{xp} / 100} \rfloor + 1$$
2. **Predefined Threshold Matrix**: The client-side level thresholds map to specific player tiers:
   ```javascript
   const LEVELS = [
     { level: 1,  name: 'Rookie',     xpRequired: 0    },
     { level: 2,  name: 'Rookie',     xpRequired: 100  },
     { level: 3,  name: 'Rookie',     xpRequired: 250  },
     { level: 4,  name: 'Rookie',     xpRequired: 450  },
     { level: 5,  name: 'Rookie',     xpRequired: 700  },
     { level: 6,  name: 'Challenger', xpRequired: 1000 },
     { level: 10, name: 'Challenger', xpRequired: 2500 },
     { level: 15, name: 'Challenger', xpRequired: 6000 },
     { level: 16, name: 'Athlete',    xpRequired: 7000 },
     { level: 20, name: 'Athlete',    xpRequired: 12000},
     { level: 30, name: 'Athlete',    xpRequired: 28000},
     { level: 31, name: 'Elite',      xpRequired: 30000},
   ];
   ```

### 1.3 Cumulative XP Self-Healing Migration
To ensure backward compatibility, the app runs a migration routine on boot. If `cumulativeXP` is missing from the user's profile, it fetches the user's entire `xpLog` subcollection, sums the entries, and writes the calculated total back to the user's profile:

```javascript
let calculatedCumulative = 0;
xpLogSnap.forEach((logDoc) => {
  calculatedCumulative += (logDoc.data().amount || 0);
});
const finalCumulative = Math.max(data.xp || 0, calculatedCumulative);
const derived = deriveLevelFromXP(finalCumulative);
await updateDoc(userRef, {
  cumulativeXP: finalCumulative,
  level: derived.level,
  levelName: derived.levelName
});
```

---

## 2. Streak Progression & Decay

Streaks incentivize training frequency and consistency.

### 2.1 Daily Logging Streak
When a session is successfully logged, the streak is calculated:
- Let $today$ be the current date string (`YYYY-MM-DD`) in the user's local timezone.
- Let $yesterday$ be the previous calendar date.
- Let $streakLastDate$ be the user's last logged session date.

$$\text{Streak} = \begin{cases}
\text{Streak} + 1 & \text{if } streakLastDate = yesterday \\
\text{Streak} & \text{if } streakLastDate = today \\
1 & \text{otherwise (gap} > 1 \text{ day, reset)}
\end{cases}$$

### 2.2 Streak Milestones
Hitting streak milestones triggers special XP awards:
- **3-Day Streak**: `+30 XP` (`streak_3` source key).
- **7-Day Streak**: `+100 XP` (`streak_7` source key).
- **30-Day Streak**: `+500 XP` (`streak_30` source key).

### 2.3 Aura Decay Rules
The **Aura Score** decays when a user is inactive for more than 72 hours (3 days):

$$\text{Aura}_{\text{decayed}} = \text{Aura}_{\text{base}} \times 0.95^{\lfloor \text{Days Inactive} - 3 \rfloor}$$

- Decay is compounding daily (5% reduction).
- The overall Aura Score is capped between `0` and `10,000` points.

---

## 3. RPG Fitness Skill Tree

Zenkai implements a level-based skill tree system, unlocking permanent passives and modifiers.

### 3.1 Skill Points Accumulation
Users earn **1 Skill Point (SP)** for every level gained:
$$\text{Remaining SP} = \max(0, \text{Level} - \text{Spent SP})$$

### 3.2 Skill Tree Nodes
Each skill node requires **4 SP** to unlock:

1. **Iron Will** (`ironWill`):
   - *Type*: Active Passive.
   - *Description*: Prevents streak decay on missed days, protecting the daily logging streak.
2. **Adrenaline Rush** (`adrenalineRush`):
   - *Type*: Active Passive.
   - *Description*: Increases the raw XP gained when setting a new Personal Record (PR) from 10 XP to **12 XP**.
3. **Recovery Protocol** (`recoveryProtocol`):
   - *Type*: Active Passive.
   - *Description*: Increases the spawn chance of Flash Quests upon workout logging from 10% to **20%**.

---

## 4. Quests & Live Engagement Engines

To increase user retention, Zenkai injects short-term challenges and wagers.

### 4.1 Flame & XP Wagers
Inside the Challenges Hub, users can bet their cumulative XP on their consistency:
- **Wager Sizes**: `50`, `100`, or `200` XP.
- **Goal**: Complete **3 workouts in 7 days**.
- **Payout**: Returns **2x the wagered XP** on success; burns the wagered XP on failure. The wager amount is immediately deducted from the user's profile upon placement.

### 4.2 Inactivity Re-ignition Quest
Triggered on application mount (`useChallenges.js`):
- If the user has been inactive (time since `lastSessionDate`) for **more than 4 days**:
- System injects a 48-hour active quest: **"Re-ignition"** (*"Log 1 workout within 48 hours to get back on track!"*).
- **Reward**: `+100 XP` on completion.

### 4.3 Flash Quests
Upon submitting any workout log, the system rolls a random chance to trigger a Flash Quest:
- **Spawn Probability**: `10%` base (increases to `20%` if the user has unlocked the `recoveryProtocol` skill).
- **Quest**: **"Flash Quest: Stretch Out"** (*"Complete a 5-minute pre-workout or post-workout stretch in your next session!"*).
- **Expiration**: 48 hours.
- **Reward**: `+50 XP` awarded upon completing the next logged workout.

---

## 5. Overdrive Hour & Gym Camera Verification

The **Overdrive Hour** is a high-intensity session verification flow.

### 5.1 Peak Time Tracking
The client calculates the user's peak workout hour (`avgWorkoutHour`) as the average of the hour components of their last 5 sessions, cached locally in `localStorage` with a 24-hour TTL:

$$\text{Peak Hour} = \text{round}\left(\frac{\sum_{i=1}^{5} \text{SessionHour}_i}{5}\right)$$

### 5.2 Window and Camera Verification
- The **Overdrive Window** is active when the current local hour is within **2 hours** of the user's peak hour:
  $$\text{Active Window} = |\text{Current Hour} - \text{Peak Hour}| \le 2$$
- During this window, the user must upload or capture a photo inside the gym.
- The image is downsampled on the client to max 1024px (`imageCompressor.js`) and validated on the backend Express server (`verifyGymImage` API) using Gemini/Groq Vision.
- If verified, the server flags `overdriveVerifiedAt: serverTimestamp()`.

### 5.3 Overdrive Workout Session
- Verification activates the Overdrive window for **60 minutes**.
- Starting an Overdrive Workout sets the session name to `Overdrive Hour Workout 🔥` and flags the session store as `isOverdrive: true`.
- **Multiplier**: Automatically applies a **1.5x XP multiplier** to all XP earned during the session on submission.

---

## 6. Social Feed Interactions & Native Alerts

Teammates interact inside the squad's activity feed.

### 6.1 Social Reactions
Users can react to teammate workouts with:
- **High-Fives**: Adds/removes user's UID to/from the activity document's `highFives` array in Firestore. Triggers a floating `👏` emoji animation on screen.
- **Kudos**: Adds/removes user's UID to/from the `kudos` array. Triggers a floating `🔥` emoji animation.
- Both actions use Framer Motion physics for floating animation overlays.
- A push notification is sent to the workout creator (e.g. *"[Name] gave you Kudos for your workout!"*).

### 6.2 Browser Notification API Helper (`notificationHelper.js`)
- **Native Requests**: Asks for permissions using standard browser `Notification.requestPermission()`.
- **Visibility Check**: Native OS notification bubbles trigger only if the browser tab is not currently visible (`document.visibilityState === 'hidden'`).
- **Mute Registry**: Blocks notifications if `zenkai_mute_squad_notifications` is set to `true` in `localStorage`.

---

## 7. Streak Rescue Gifting

Teammates can rescue each other's active streaks. If a squad member is about to lose their streak, any teammate can spend **50 XP** to gift them a **Streak Shield**.

This operation is executed in a single atomic Firestore **transaction** to prevent double-spending:

```javascript
await runTransaction(db, async (transaction) => {
  const myData = (await transaction.get(myUserRef)).data();
  if (myData.xp < 50) throw new Error("Insufficient XP");

  const targetData = (await transaction.get(targetUserRef)).data();
  const currentShields = targetData.powerUps?.streakShield || 0;

  // 1. Deduct 50 XP from sender
  transaction.update(myUserRef, { xp: myData.xp - 50 });
  
  // 2. Add 1 Streak Shield to teammate
  transaction.update(targetUserRef, { 
    'powerUps.streakShield': currentShields + 1 
  });
  
  // 3. Log a negative XP transaction for the sender
  transaction.set(xpLogRef, {
    amount: -50,
    reason: `Gifted Streak Shield to ${targetName}`,
    timestamp: new Date()
  });
});
```

A push notification is dispatched to the rescued teammate.

---

## 8. Power-ups & Consumables Registry

Consumables are stored in the `powerUps` map on the user's document:

| Key | Name | Purpose | How obtained |
|---|---|---|---|
| `streakShield` | Streak Shield 🛡️ | Automatically consumes on a missed workout day to protect the consistency streak. | Loot boxes, Streak Rescue gift |
| `xpBooster` | 2x XP Booster ⚡ | Doubles all earned XP for 24 hours. | Loot boxes |
| `challengeSkip` | Quest Skip ⏭️ | Skips a single day of an active challenge. | Loot boxes |
| `planRefresh` | Plan Refresh 🔄 | Bypasses the 5 free daily plan regenerations limit. | Loot boxes |
| `bossFightKey` | Boss Key 🔑 | Required to open treasure chests or manually summon Titans. | Completing workouts, Titan defeats |

---

## 9. Loot Box Chest Mechanics

Users spend Boss Keys to open chests containing XP, consumables, titles, or auras.

### 9.1 Chest Costs and Rarity Tiers
- **Common Chest**: Costs `1 key`. Rarity odds: `[0.70 common, 0.25 rare, 0.05 legendary]`.
- **Rare Chest**: Costs `3 keys`. Rarity odds: `[0.15 common, 0.65 rare, 0.20 legendary]`.
- **Legendary Chest**: Costs `5 keys`. Rarity odds: `[0.00 common, 0.25 rare, 0.75 legendary]`.

### 9.2 Rarity Loot Tables
```javascript
const REWARDS = {
  common: [
    { type: 'xp', value: 150, name: '+150 XP' },
    { type: 'xp', value: 200, name: '+200 XP' },
    { type: 'consumable', key: 'challengeSkip', value: 1, name: '1 Quest Skip ⏭️' },
    { type: 'consumable', key: 'streakShield', value: 1, name: '1 Streak Shield 🛡️' }
  ],
  rare: [
    { type: 'xp', value: 450, name: '+450 XP' },
    { type: 'consumable', key: 'challengeSkip', value: 3, name: '3 Quest Skips ⏭️' },
    { type: 'consumable', key: 'xpBooster', value: 1, name: '1 2x XP Booster ⚡' },
    { type: 'title', key: 'pr_demon', name: 'PR Demon Title (15d)', days: 15 },
    { type: 'title', key: 'titan_hunter', name: 'Titan Hunter Title (15d)', days: 15 }
  ],
  legendary: [
    { type: 'xp', value: 1200, name: '+1200 XP' },
    { type: 'xp', value: 2000, name: '+2000 XP' },
    { type: 'aura', key: 'crimson', name: 'Crimson Aura (30d)', days: 30 },
    { type: 'aura', key: 'golden', name: 'Golden Aura (30d)', days: 30 },
    { type: 'aura', key: 'shadow', name: 'Shadow Aura (30d)', days: 30 },
    { type: 'title', key: 'pr_demon', name: 'PR Demon Title (30d)', days: 30 },
    { type: 'title', key: 'titan_hunter', name: 'Titan Hunter Title (30d)', days: 30 }
  ]
};
```

### 9.3 Cryptographically Secure RNG
To prevent client-side seed prediction and timing-based manipulation, chest rolling is handled on the Express backend using Node.js's cryptographically secure pseudo-random number generator (`crypto.randomInt`):

```javascript
const { randomInt } = require('crypto');

// Roll between [0, 1) with uniform distribution
const PRECISION = 10000;
const rand = randomInt(0, PRECISION) / PRECISION;
```

---

## 10. Sunday Classifieds Easter Egg

The **Sunday AI Magazine** (newspaper view) contains a hidden ad layout displaying the promo code:
`ZK-SYNERGY-2026`

When entered in the **Join Squad** text field inside the Squad Matchmaker, it matches against this hardcoded code:
1. It queries the user's `xpLog` to check if the reason `Sunday Newspaper Secret Synergy Code` has been logged.
2. If already redeemed, it returns a validation error.
3. If valid, it increments the user's profile by `+25 XP` and logs a new `xpLog` document to prevent reuse.
4. It displays an alert confirming the secret code has been redeemed.
