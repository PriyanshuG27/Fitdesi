# Zenkai — Production Audit Checklist

**Version:** 1.1  
**Scope:** Run before every production deploy. Tick every box. If any check fails, resolve it before deploying.

---

## SECTION A — Security Audit

### A1. Secrets + API Keys
- [ ] `grep -rn "GEMINI" src/` $\rightarrow$ zero results.
- [ ] `grep -rn "GROQ" src/` $\rightarrow$ zero results.
- [ ] `git status` shows no `.env` or service keys committed.
- [ ] All API keys are set in Render/Vercel dashboards, not hardcoded.

### A2. Firestore Security Rules
- [ ] All rules test matrix cases pass (SECURITY.md).
- [ ] Rules deployed successfully: `firebase deploy --only firestore:rules`.

### A3. Express Backend Security
- [ ] `authGuard` middleware applied to secure endpoints.
- [ ] Rate limits (plan updates, gym checks) implemented via user doc transactions.
- [ ] No credential or auth token logging.
- [ ] CORS allowed origins locked to production Vercel domain in Render settings.

---

## SECTION B — Data Integrity Audit

- [ ] Workout logs commit atomically via `writeBatch()`.
- [ ] XP updates use atomic increment: `FieldValue.increment()`.
- [ ] User profile cumulative XP self-healing run on boot.

---

## SECTION C — Testing & Coverage

- [ ] All 455 unit, component, and integration tests passing (`npm run test -- --run`).
- [ ] Hook test coverage $\ge 85\%$, overall coverage $\ge 75\%$.
- [ ] Backend route tests mock Firebase Admin database actions and verify status codes (400, 401, 429, etc.).

---

## SECTION D — UX & Viewport Audit

- [ ] Mobile navigation (bottom nav) visible and fully responsive.
- [ ] Desktop command center (sidebar, dashboard grid) matches $\ge 1024$px viewports.
- [ ] Proactive `/health` background ping triggered on client boot to wake up Render containers.

---

## SECTION E — Deployment Sequence

```bash
# 1. Verify tests pass
npm run test -- --run

# 2. Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes

# 3. Push to GitHub (triggers Vercel client deploy)
git push origin main

# 4. Render auto-deploys backend Express Web Service.
#    Verify backend build logs and check service health (/health endpoint).
```
