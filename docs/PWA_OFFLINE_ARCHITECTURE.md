# Zenkai — PWA & Offline-First Architecture

This document details the progressive web application (PWA) configuration, offline storage synchronization, caching optimization patterns, and recovery procedures that keep Zenkai fast and resilient.

---

## 1. PWA Shell & Installation

Zenkai is designed as an offline-first PWA, providing native app behaviors on mobile and desktop platforms.

### 1.1 Manifest & Capabilities
The Web App Manifest configures:
- **Display Standalone**: Runs without browser UI bars.
- **Theme Color**: Neubrutalist base black (`#080808`).
- **Icons**: Responsive high-res masks and logos.
- **Service Worker**: Uses Workbox to cache static bundles, CSS stylesheets, Google Fonts, and assets.

### 1.2 Installation Prompts & Standalone Checks
- **Platform Detection**: On mount (`App.jsx`), checks standalone modes:
  ```javascript
  const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  ```
- **Custom Prompts**: Listens for the browser's `beforeinstallprompt` event. Rather than relying on default browser prompts, it captures and saves the event to the global UI store:
  ```javascript
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    setPwaDeferredPrompt(e);
  });
  ```
- **iOS Safari Support**: If the user is on iOS (which lacks `beforeinstallprompt` support), Zenkai displays a custom overlay tutorial guiding them to tap the Safari "Share" button and select "Add to Home Screen".

---

## 2. Offline Sync Engine (`useSyncEngine.js`)

To prevent workout logs from being lost due to intermittent gym cellar connectivity, Zenkai implements a dual-vector sync engine.

### 2.1 IndexedDB Queueing
- When offline, network requests to the database fail.
- The app intercepts these failures and writes them to local storage using `IndexedDB`.
- Workouts, sets, reps, and RPEs are stored in a serialized synchronization queue.

### 2.2 Dual-Vector Reconnection Sync
When the network state fires a reconnect event (`navigator.onLine` listener):
1. **Queue Flush**: The app flushes the queued records to the server sequentially.
2. **Dual-Vector Conflict Resolution**: Rather than using a simple Last-Write-Wins (LWW) rule that could overwrite offline data, Zenkai splits sync collections:
   - **Planned Schedules** (`planned_targets`) use remote-state resolution.
   - **Logged Sessions** (`executed_sessions`) append records directly, avoiding data loss.

---

## 3. Stale-While-Revalidate (SWR) Profile Caching

The #1 metric killer for Firebase web applications is the initial connection delay on cold starts, where the app displays a loading spinner for 2–4 seconds waiting for the Firestore auth check. Zenkai resolves this with Stale-While-Revalidate caching.

```
       [ App Boots ]
             │
             ├──► Hydrate immediately from localStorage (`readProfileCache`)
             │    Allows user to see dashboard instantly (0ms LCP)
             │
             ▼
  [ Firebase Auth Resolves ]
             │
             ├──► Start Firestore real-time `onSnapshot` listeners
             │
             ▼
[ Background Profile Updates ]
             │
             └──► Merge new data into store, call `writeProfileCache` to update local cache
```

- **Hydration**: The app reads cached profile data from `localStorage` on boot.
- **Instant Render**: Hydrating the store on boot allows rendering the dashboard without waiting for Firestore.
- **Background Sync**: Firestore snapshots run in the background. Once the network query completes, the data is merged into the store and updated in `localStorage` for the next boot.

---

## 4. Global ChunkLoadError Auto-Recovery

When a new version of the app is deployed, filename hashes change. If a PWA is running from a background tab, it might try to load a lazy-loaded page using an old hash, resulting in a `ChunkLoadError`.

Zenkai prevents this white-screen failure using a custom `safeLazy` wrapper:

```javascript
export function safeLazy(importFn) {
  return React.lazy(async () => {
    try {
      return await importFn();
    } catch (error) {
      const alreadyReloaded = sessionStorage.getItem('chunk_reload_attempted') === 'true';
      if (!alreadyReloaded) {
        sessionStorage.setItem('chunk_reload_attempted', 'true');
        window.location.reload(); // Reload once to pick up the new deploy
        return new Promise(() => {}); // Suspend until reload completes
      }
      throw error; // Already tried reloading, propagate to ErrorBoundary
    }
  });
}
```

- **Single Reload**: The wrapper reloads the browser to pick up the updated bundles.
- **Deduplication**: Using `sessionStorage` tracks if a reload has been attempted, preventing refresh loops.
- **Boundary Fallback**: If the chunk is genuinely missing, the error is passed to the global `ErrorBoundary` which displays an "Update Now" recovery screen.

---

## 5. Dual-Viewport Layout Engine

To handle mobile phones and desktop command centers, Zenkai mounts entirely different component trees based on viewport dimensions.

- **Responsive Listener**: The custom hook `useDeviceLayout.js` monitors screen size, using a 100ms debounce to filter resize events and prevent layouts from thrashing.
- **Viewport Selection**:
  - `mobile` (width $< 1024$px) $\rightarrow$ Renders `MobileApp` with a thumb-friendly bottom navigation bar.
  - `desktop` (width $\ge 1024$px) $\rightarrow$ Renders `DesktopApp` with a multi-column command center sidebar.
- **Shared State**: Both views share the same Router and Zustand context, ensuring state is preserved if a user rotates their device.
