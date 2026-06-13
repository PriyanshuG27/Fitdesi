# Zenkai — Error Handling Architecture

This document details the classification, reporting, and recovery mappings of exceptions and failures in the Zenkai React client and Express backend.

---

## 1. Error Taxonomy

Errors in Zenkai fall into five main categories:

| Category | Source | Resolution |
|---|---|---|
| **AUTH** | Firebase Auth | Redirect to login or display inline error message |
| **FIRESTORE** | Firestore SDK | Trigger optimistic retry or graceful offline fallback |
| **BACKEND_API** | Express API endpoints | Return appropriate HTTP status codes and details |
| **AI_MODEL** | Gemini/Groq calls | Fall back to local caching and show retry option |
| **PWA_SHELL** | Service Worker or hash mismatch | Trigger browser reload via `safeLazy` |

---

## 2. Express Backend HTTP Response Codes

The companion Express backend maps business logic exceptions to standard HTTP response codes:

| HTTP Status | Context | Client Action |
|---|---|---|
| **400 Bad Request** | Missing body parameters, validation errors, rest seconds exceed 600s | Toast warning to user |
| **401 Unauthenticated** | Missing or invalid Bearer token in headers | Clear auth state and redirect to login |
| **403 Forbidden** | Not a member of targeted squad | Deny action and show alert toast |
| **429 Too Many Requests** | Exceeded plan generation (5/day) or gym checks limit (2/5m, 5/24h) | Show rate limit warning (recommending Plan Refresh power-up) |
| **500 Server Error** | AI models timeout or database transactions failed | Return standard error payload and log trace |

---

## 3. Client Error Handler Constants

On the frontend, Express API response failures are caught and mapped using unified error codes:

```javascript
// src/lib/errors.js
export const ERROR_CODES = {
  // Auth
  AUTH_INVALID_CREDENTIAL: 'auth/invalid-credential',
  AUTH_EMAIL_IN_USE:        'auth/email-already-in-use',
  AUTH_WEAK_PASSWORD:       'auth/weak-password',
  AUTH_USER_NOT_FOUND:      'auth/user-not-found',

  // Firestore
  FS_PERMISSION_DENIED:     'firestore/permission-denied',
  FS_UNAVAILABLE:           'firestore/unavailable',
  FS_NOT_FOUND:             'firestore/not-found',

  // Express API Client
  API_UNAUTHENTICATED:      'api/unauthenticated',
  API_RATE_LIMITED:         'api/too-many-requests',
  API_FORBIDDEN:            'api/forbidden',
  API_SERVER_ERROR:         'api/server-error',
};

export const USER_MESSAGES = {
  [ERROR_CODES.AUTH_INVALID_CREDENTIAL]: 'Email or password is incorrect.',
  [ERROR_CODES.AUTH_EMAIL_IN_USE]:       'An account with this email already exists.',
  [ERROR_CODES.FS_UNAVAILABLE]:          'Connection lost. Zenkai is running in offline mode.',
  [ERROR_CODES.API_RATE_LIMITED]:         'Daily limit reached. Use a Plan Refresh or try again tomorrow.',
  [ERROR_CODES.API_SERVER_ERROR]:        'The AI coach is temporarily offline. Loading fallback metrics...',
};
```

---

## 4. Service Worker Chunk Failures Recovery

If the PWA fails to load a lazy-loaded chunk (due to cached stale index references after a new build has deployed), Zenkai intercepts it via `safeLazy` to reload the page once:

```javascript
window.location.reload();
```

If it fails to fetch after a reload, the error is passed to the global `ErrorBoundary` which displays a Neubrutalist recovery screen offering the user a manual update button.
