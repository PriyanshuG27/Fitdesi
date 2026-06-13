# Zenkai — Deployment Manual

This document details the production build, environment configuration, and hosting setups for the Zenkai application.

---

## 1. Production Architecture Overview

The system is split into three main components:

```
                  [ Git Repository (GitHub) ]
                               │
            ┌──────────────────┴──────────────────┐
            ▼ (Continuous Deployment)             ▼ (Manual or Web Service)
  [ Vercel Web Hosting ]               [ Render Cloud Hosting ]
     React PWA Client                    Node.js Express API
            │                                     │
            └───────────────┬─────────────────────┘
                            ▼
                [ Firebase Console Services ]
                 Auth + Firestore Database
```

1. **Frontend**: React client hosted on **Vercel** with automatic deployment on pushes to `main`.
2. **Backend**: Express server hosted on **Render** (Node.js web service).
3. **Database & Auth**: Firestore and Firebase Auth, managed via the **Firebase CLI** for rules and indexes deployment.

---

## 2. Vercel Frontend Deployment

Vercel hosts the compiled static assets and resolves index paths for SPA routes.

### 2.1 Build Configurations
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework Preset**: `Vite`

### 2.2 Client Routing Rewrite Rule
Vercel requires a redirection configuration in `vercel.json` at the root of the project to prevent `404 Not Found` errors when refreshing routes like `/home` or `/profile`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 3. Render Backend Deployment

The Node.js Express backend is deployed as a Web Service on Render.

### 3.1 Web Service Settings
- **Runtime**: `Node`
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: `Web Service` (Free or Starter tier)

### 3.2 CORS Locking
Set `ALLOWED_ORIGINS` to your production Vercel URL (e.g. `https://zenkai.vercel.app`) in the Render environment settings to block cross-origin requests from other domains.

---

## 4. Firebase CLI Database Deployments

Firestore security rules and indexes must be deployed from the command line using the Firebase CLI.

```bash
# 1. Log in to your Firebase account
firebase login

# 2. Select your active production project
firebase use production-project-id

# 3. Deploy Firestore security rules
firebase deploy --only firestore:rules

# 4. Deploy composite queries indexes
firebase deploy --only firestore:indexes
```

---

## 5. Pre-Deployment Verification Checklist

Complete this checklist before merging changes to `main`:

- [ ] **Local Build**: Runs `npm run build` locally with no errors.
- [ ] **Tests Passing**: Runs `npm run test` and verifies all 455 unit/integration tests pass.
- [ ] **No Secrets Committed**: Verifies `.env` files are not tracked by Git (`git status`).
- [ ] **Server URL Set**: Confirms `VITE_API_BASE_URL` in Vercel points to the Render server URL.
- [ ] **CORS Configured**: Confirms `ALLOWED_ORIGINS` in Render contains the Vercel app domain.
- [ ] **Database Rules Deployed**: Confirms the latest `firestore.rules` are deployed.
- [ ] **Firestore Indexes Deployed**: Confirms composite indexes are built and operational on the Firebase Console.
