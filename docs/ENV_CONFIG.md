# Zenkai — Environment Configuration

This document lists all environment variables required to run Zenkai locally and in production.

---

## 1. Client Environment Configuration

The React frontend is built with Vite. Client variables must be prefixed with `VITE_` to be bundled into the client code.

Create a `.env` file in the project root directory:

```bash
# .env (Never commit this file to Git)
VITE_FIREBASE_API_KEY=AIzaSyA1...
VITE_FIREBASE_AUTH_DOMAIN=zenkai-fit.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=zenkai-fit
VITE_FIREBASE_STORAGE_BUCKET=zenkai-fit.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=102938475610
VITE_FIREBASE_APP_ID=1:102938475610:web:a1b2c3d4e5f6
VITE_API_BASE_URL=http://localhost:10000  # Points to local Express server in dev
```

### 1.1 Client Variables Registry
- `VITE_FIREBASE_API_KEY`: Initialises the Firebase web client.
- `VITE_FIREBASE_AUTH_DOMAIN` / `VITE_FIREBASE_PROJECT_ID` / `VITE_FIREBASE_APP_ID`: Firebase connection credentials.
- `VITE_API_BASE_URL`: Base API route pointing to the Express server.
  - In development: `http://localhost:10000`
  - In production: URL of the hosted Render web service (e.g. `https://zenkai-backend.onrender.com`).

---

## 2. Backend Environment Configuration

The Express server runs as a separate service. Create a `.env` file inside the `backend/` folder:

```bash
# backend/.env (Never commit this file to Git)
PORT=10000
ALLOWED_ORIGINS=http://localhost:5173  # Comma-separated allowed origins (dev)
GEMINI_API_KEY=AIzaSyB2...             # Primary Vision/AI model key
GROQ_API_KEY=gsk_3c9d...               # Primary LLM / Fallback Vision key

# Firebase Admin SDK credentials
FIREBASE_PROJECT_ID=zenkai-fit
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@zenkai-fit.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### 2.2 Backend Variables Registry
- `PORT`: Port the Express server listens on (defaults to `10000`).
- `ALLOWED_ORIGINS`: Comma-separated client origins allowed by CORS.
  - In production, set to your Vercel deployment URL (e.g. `https://zenkai.vercel.app`).
- `GEMINI_API_KEY`: Key for Google AI Studio API (used for plan generation, image checks, and backups).
- `GROQ_API_KEY`: Key for Groq Cloud API (used for Llama 3 models in challenges, weekly magazines, and standards).
- `FIREBASE_PROJECT_ID`: Firebase project identifier.
- `FIREBASE_CLIENT_EMAIL`: Service account email used by the Admin SDK.
- `FIREBASE_PRIVATE_KEY`: Service account private key string.
  - **Note**: Ensure line breaks (`\n`) are preserved. In hosting environments, wrap the string in double quotes.

---

## 3. Local Development Startup Checklist

To run the full stack locally:

```bash
# 1. Install dependencies at root and backend
npm install
cd backend && npm install
cd ..

# 2. Run the Frontend (Terminal 1)
npm run dev
# -> Opens on http://localhost:5173

# 3. Run the Express Backend (Terminal 2)
cd backend
npm start
# -> Operational on port 10000
```

---

## 4. Production Environment Mapping (Render & Vercel)

When deploying, map these variables in the respective dashboard interfaces:

### 4.1 Vercel Dashboard (Frontend)
Set the following keys in Vercel project Settings $\rightarrow$ Environment Variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_API_BASE_URL` (Points to Render backend URL)

### 4.2 Render Dashboard (Backend Web Service)
Set the following keys in Render Environment configuration:
- `PORT` = `10000`
- `ALLOWED_ORIGINS` = `https://your-vercel-domain.vercel.app`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (Paste the service account private key string directly)
