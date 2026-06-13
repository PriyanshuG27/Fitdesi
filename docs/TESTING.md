# Zenkai — Testing Documentation

This document describes the testing stack, methodologies, and directories used to verify correctness across the React client and the Express backend.

---

## 1. Testing Stack Overview

| Layer | Tool | Purpose |
|---|---|---|
| Frontend Unit & Component | Vitest + React Testing Library + JSDOM | Zustand stores, custom hooks, and shared components |
| Backend Endpoint & Unit | Vitest + Mocks | REST API route controllers, validators, and schedulers |
| E2E | Playwright | Complete user journeys (auth, workout logging, PWA modals) |

---

## 2. Directory Layout

Tests are co-located or grouped under `src/__tests__/`:

```
src/
├── __tests__/
│   ├── authStore.test.js           # Client auth store
│   ├── backendRoutes.test.js       # Express REST endpoints (mocked db)
│   ├── functions.test.js           # Biomechanical utilities
│   ├── SquadDraft.test.jsx         # Scouting/scout draft component integration
│   ├── useSquadStore.test.js       # Zustand squad store
│   └── ...
```

---

## 3. Running Tests

To run the test suites:

```bash
# Run all Vitest unit and integration tests (single run)
npm run test -- --run

# Run tests with coverage reporting
npm run test:coverage

# Run Playwright E2E browser tests
npm run test:e2e
```

---

## 4. Frontend Component & Store Tests

Zustand stores are tested by resetting state and verifying mutations:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { useXPStore } from '../stores/useXPStore';

describe('useXPStore', () => {
  beforeEach(() => {
    useXPStore.setState({ currentXP: 0, level: 1 });
  });

  it('adds XP and triggers level ups', () => {
    const store = useXPStore.getState();
    store.addXP(150);
    expect(useXPStore.getState().currentXP).toBe(150);
  });
});
```

---

## 5. Backend API & Express Route Tests

Express controller handlers are verified in Vitest by mocking the Firebase Admin SDK (`firebase-admin`) and request/response objects:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import scheduleRestNotification from '../../backend/routes/scheduleRestNotification';

describe('scheduleRestNotification Endpoint', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { uid: 'user-123' },
      body: { seconds: 120 }
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  it('rejects invalid seconds parameter', async () => {
    req.body.seconds = -10;
    const [authGuard, handler] = scheduleRestNotification;
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

---

## 6. End-to-End Tests (Playwright)

Playwright tests verify complete PWA workflows by driving a headless browser through the user signup, check-in, and workout logging flows.
