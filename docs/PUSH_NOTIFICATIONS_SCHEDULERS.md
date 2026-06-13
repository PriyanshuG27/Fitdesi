# Zenkai — Push Notifications & Schedulers Architecture

This document details the backend schedulers, push notification pipeline, rest timer scheduling mechanisms, and automated background jobs that run in the Zenkai system.

---

## 1. Firebase Cloud Messaging (FCM) Integration

Zenkai uses Firebase Cloud Messaging (FCM) for low-latency PWA web push notifications, keeping squad members synced.

### 1.1 FCM Client Registration Flow
1. **Boot Hook** (`useFCM.js`): On app mount, the hook initializes the FCM client SDK.
2. **Permission Request**: Prompt the user to grant notification permission via the browser APIs.
3. **Token Generation**: Retrieve the PWA device token using `getToken(messaging, { vapidKey: ... })`.
4. **Token Sync**: Write the token to Firestore under `/users/{uid}` in the `fcmToken` (or `fcmTokens` array) field.
5. **Foreground Listener**: Registers an `onMessage` listener. If a message is received while the app is in the foreground, it intercepts the notification and displays it as a neubrutalist UI toast stack instead of a browser alert.

### 1.2 FCM Server Sender (`fcmSender.js`)
On the backend, notifications are dispatched using the Firebase Admin SDK:

```javascript
const admin = require('firebase-admin');

async function sendPushNotification({ recipientUids, title, body, data }) {
  // 1. Query recipient documents to get fcmTokens
  // 2. Format multicast message payload:
  const message = {
    tokens: targetTokens,
    notification: { title, body },
    data: {
      url: data.url || '/home',
      ...data
    },
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        icon: '/logos/zenkai_official_logo.png',
        badge: '/logos/badge_mono.png',
        requireInteraction: true
      }
    }
  };
  
  // 3. Dispatch multicast
  const response = await admin.messaging().sendEachForMulticast(message);
  // 4. Prune expired or invalid tokens from database on failure responses
}
```

---

## 2. Server-Side Rest Timers

To prevent rest timers from being terminated by mobile browsers suspending background JavaScript threads (which suspends client-side `setTimeout`), Zenkai runs rest notifications on the backend.

```
[ Client Logs Set ] ──► POST /api/scheduleRestNotification (duration in seconds)
                              │
                              ▼
                      [ Backend Express ]
                              │
                      Store setTimeout in:
                      activeTimeouts = Map { uid -> timerId }
                              │
                  ┌───────────┴───────────┐
                  ▼ (runs out)            ▼ (next set started early)
         [ sendPushNotification ]      Client: POST /api/cancelRestNotification
                  │                               │
                  ▼                               ▼
          Rest Over! 💪                  clearTimeout(timerId)
                                         delete from Map
```

### 2.1 Scheduling Endpoint (`POST /api/scheduleRestNotification`)
- Checks auth token.
- Receives `seconds` (validated as an integer, capped at 600 seconds/10 minutes to prevent resource exhaustion).
- Clears any existing timeout for that UID in the memory cache.
- Establishes a backend `setTimeout` that fires `sendPushNotification()` to the user's registered tokens.
- Saves the `timerId` to the `activeTimeouts` memory Map.

### 2.2 Cancellation Endpoint (`POST /api/cancelRestNotification`)
- If the user starts their next set before the timer expires, the client calls this endpoint.
- Resolves the UID, fetches the `timerId` from the `activeTimeouts` Map, runs `clearTimeout(timerId)`, and removes the entry from the Map.

---

## 3. Background Schedulers

The Express server runs two background interval loops.

### 3.1 1-Hour Gym Time Reminders (`reminderScheduler.js`)
Runs an interval check every **5 minutes** to search for check-ins that are exactly 1 hour away.

1. **Firestore Query**: Checks the `presence` collection group:
   ```javascript
   const rangeStart = new Date(now.getTime() + 55 * 60 * 1000);
   const rangeEnd = new Date(now.getTime() + 65 * 60 * 1000);
   const presenceSnap = await adminDb.collectionGroup('presence')
     .where('targetTimestamp', '>=', rangeStart)
     .where('targetTimestamp', '<=', rangeEnd)
     .get();
   ```
2. **Personal Workout Reminders**: If `personalNotified` is false, dispatches a personal notification to the lifter and updates the document.
3. **Teammate Workout Reminders**: If `teammatesNotified` is false, queries the member's squad, filters out the sender, broadcasts to all teammates (e.g. *"Priyanshu is hitting the gym in 1 hour!"*), and updates the presence document.

### 3.2 Weekly Challenge Reset (`weeklyChallengeScheduler.js`)
Runs an interval check every **1 hour**. It automatically creates a new weekly synergy challenge (Titan Raid Boss) for every squad.

- **Trigger Window**: Executes only on **Sundays** between **00:00 and 02:00** local server time.
- **Double-Run Lock**: Updates the `lastRunWeek` timestamp in `system/squad_challenge_scheduler` to prevent concurrent scaling containers from running duplicate resets.
- **API Rate Limiting Spacing**: Iterates through all squads sequentially, inserting a **3-second delay** between Titan generations to prevent rate limits on Groq/Gemini calls.
- **Lore Generation**: Calls Groq (primary) or Gemini (fallback) to build the Titan's name, weakness, rewards, and custom lore based on the squad's aggregated historical training volumes.

### 3.3 Production Broadcast Utility (`productionBroadcast.js`)
Runs once during server initialization to announce system-wide updates.

- **Emulator Safety Gate**: Skips execution if `VITE_FIREBASE_EMULATOR` or `FUNCTIONS_EMULATOR` is `true`.
- **Deduplication Check**: Checks `system_config/updates` for version flag `broadcast_{version}_sent`. If true, exits.
- **Multicast Send**: Pulls all registered users from Firestore, chunks them, and triggers a system-wide push notification.
- **Audit Lock**: Sets `broadcast_{version}_sent = true` in Firestore upon successful dispatch.
