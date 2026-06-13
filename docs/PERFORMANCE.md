# Zenkai — Performance & Optimization Manual

This document outlines the optimization strategies, caching systems, and bundle configurations that keep Zenkai's LCP, FCP, and interactive performance fast.

---

## 1. Stale-While-Revalidate (SWR) Profile Caching

The #1 performance optimization in the Zenkai client is local hydration of user profiles to eliminate blocking network requests on startup.

- **The Problem**: Waiting for Firebase Auth and Firestore queries on boot blocks the initial paint for up to 3 seconds.
- **The Solution**: Zenkai caches the user's merged profile document in `localStorage` on update. On boot, it immediately mounts the dashboard using this cached state.
- **Background Refresh**: The Firestore real-time listener updates the store and the local cache in the background once connected, resolving data changes dynamically.

---

## 2. Code Splitting & Manual Chunks (Vite / Rollup)

To keep the initial JS chunk size small, heavy modules are split into separate chunks.

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase-auth':      ['firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          'framer-motion':      ['framer-motion'],
          'recharts':           ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
});
```

Splitting heavy dependencies (like Firebase Auth, Firestore, Recharts, and Framer Motion) ensures that these rarely changing vendor scripts are cached by the user's browser, preventing re-downloading between application updates.

---

## 3. Render Free Tier Proactive Wake-Up

The backend runs on the Render Free Tier, which automatically spins down/sleeps the container after 15 minutes of inactivity. When a sleeping backend is queried, it results in a **30–50 second cold-start latency**.

### 3.1 Mitigation Flow
Zenkai implements a proactive wake-up flow:
1. **Boot Call**: As soon as the React application mounts (`App.jsx`), it fires a non-blocking `GET` request to the backend `/health` or `/ping` endpoint in the background:
   ```javascript
   fetch(`${import.meta.env.VITE_API_BASE_URL}/health`).catch(() => {});
   ```
2. **Spin-Up**: While the user is navigating the landing page or logging in, the Render container spins up.
3. **Warm Execution**: By the time the user requests plan generation or gym verification, the backend is warm, responding in milliseconds.
