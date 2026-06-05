<div align="center">

  <!-- 🔥 Animated Typing Headline 🔥 -->
  <a href="https://github.com/PriyanshuG27/Fitdesi">
    <img src="https://readme-typing-svg.herokuapp.com?font=Barlow+Condensed&weight=800&size=55&pause=1000&color=FF5C00&center=true&vCenter=true&width=800&lines=FITDESI+⚡;TRAIN+SMARTER.+🧠;COME+BACK+STRONGER.+🏋️;POWERED+BY+GEMINI+AI+🚀" alt="Typing SVG" />
  </a>

  <!-- 🖼️ Dynamic Custom SVG Banner (Using CDN for guaranteed rendering) -->
  <img src="https://cdn.jsdelivr.net/gh/PriyanshuG27/Fitdesi@main/public/fitdesi_banner_v5.svg" alt="FitDesi Banner" width="100%" />

  <br /><br />
  
  <img src="https://cdn.jsdelivr.net/gh/PriyanshuG27/Fitdesi@main/public/gemini_badge_v3.svg" alt="Powered by Gemini AI" />
  
  <h3>⚡ Premium Dark Athletic Gym Tracker &amp; Recovery Platform ⚡</h3>
  
  <p>
    <b>FitDesi</b> is a high-energy, OLED-optimized fitness platform tailored for the Indian gym culture. Build streaks, shatter PRs, and let Gemini AI craft your ultimate comeback.
  </p>

  <!-- 🛡️ Cool Tech Badges -->
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase" />
    <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white" alt="Gemini AI" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
    <img src="https://img.shields.io/badge/Zustand-443E38?style=for-the-badge&logo=react&logoColor=white" alt="Zustand" />
  </p>
</div>

---

## 🚀 The Control Center (System Status)

> **"Your body is a machine. This is the dashboard."**

<table align="center" style="border-collapse: collapse; border: 2px solid #333; background: #080808; font-family: 'Courier New', Courier, monospace; width: 100%; border-radius: 8px; overflow: hidden;">
  <tr style="border-bottom: 1px solid #333;">
    <td style="padding: 15px; border-right: 1px solid #333;"><strong>⚡ STATUS</strong></td>
    <td style="padding: 15px; color: #B5FF2D; border-right: 1px solid #333; text-shadow: 0 0 5px #B5FF2D;">🟢 PRODUCTION ACTIVE</td>
    <td style="padding: 15px; border-right: 1px solid #333;"><strong>🤖 AI ENGINE</strong></td>
    <td style="padding: 15px; color: #00D4FF; text-shadow: 0 0 5px #00D4FF;">⚡ GEMINI 1.5 FLASH</td>
  </tr>
  <tr>
    <td style="padding: 15px; border-right: 1px solid #333;"><strong>💾 CORE DB</strong></td>
    <td style="padding: 15px; color: #FF5C00; border-right: 1px solid #333; text-shadow: 0 0 5px #FF5C00;">🔥 FIRESTORE</td>
    <td style="padding: 15px; border-right: 1px solid #333;"><strong>🔒 SECURITY</strong></td>
    <td style="padding: 15px; color: #F0F0F0; text-shadow: 0 0 5px #FFF;">🛡️ FIREBASE AUTH</td>
  </tr>
</table>

---

## 🔥 Features that make FitDesi Insane

| Feature | Description | Why it matters |
| :--- | :--- | :--- |
| 🎨 **Neubrutalism UI** | Deep OLED Black base with Burnt Orange, Electric Cyan, and Acid Lime accents. | Saves battery + Ultra-high contrast in bright gyms. |
| 🧠 **Gemini-Powered AI** | Serverless AI that auto-generates plans based on your equipment and medical flags. | No more guessing. Total optimization. |
| 🩹 **Phoenix Protocol** | 8-week structured protocol to rebuild strength after a long break without injury. | Keeps ego in check, prevents day-1 injuries. |
| 🛡️ **Medical Safety Rules** | Automatically bans unsafe exercises (e.g., Heavy Squats for bad knees). | Train hard, but train safe. |
| 🎮 **Gamification & XP** | Level up from **Rookie** 🟢 to **Elite** 🔴 by hitting PRs and keeping streaks. | Pure addiction to the grind. |
| ⌨️ **Power-User Hotkeys** | Instant logging with `<kbd>Alt</kbd> + <kbd>S</kbd>` and quick add shortcuts. | Never slow down your workout flow. |

---

## 📐 AI Architecture & Flow

```mermaid
graph TD
    %% Styling
    classDef client fill:#080808,stroke:#00D4FF,stroke-width:2px,color:#FFF;
    classDef firebase fill:#080808,stroke:#FF5C00,stroke-width:2px,color:#FFF;
    classDef gemini fill:#080808,stroke:#B5FF2D,stroke-width:2px,color:#FFF;

    subgraph "📱 Client (React + Vite)"
        UI[Dual-Viewport App Shell]:::client
        Store[Zustand State Engine]:::client
        UI --> Store
    end

    subgraph "☁️ Firebase Backend"
        Auth[Auth Gateway]:::firebase
        DB[(Firestore DB)]:::firebase
        Func[Cloud Functions V2]:::firebase
    end

    subgraph "🧠 AI Core"
        AI[Gemini 1.5 Flash]:::gemini
    end

    Store -->|Syncs Data| DB
    Store -->|Triggers Gen| Func
    Func -->|Constructs Prompt| AI
    AI -->|Returns JSON Plan| Func
    Func -->|Saves Plan| DB
```

---

## 🎮 Gamification & Tiers

Your sweat translates into points. Hit PRs, complete missions, and rise through the ranks.

- **Rookie 🟢** (Lv 1-5): The beginning of the journey.
- **Challenger 🔵** (Lv 6-15): Unlock custom challenges & streak warnings.
- **Athlete 🟡** (Lv 16-30): Access deep 180-day progress charts.
- **Elite 🔴** (Lv 31+): Unlock global leaderboards and Streak Shields.

> 💎 **Pro Tip:** Completing a **Phoenix Comeback Session** awards a **2x XP Multiplier!**

---

## 🛠️ Quick Start (Developer Mode)

Ready to enter the code? 

```bash
# 1. Clone the matrix
git clone https://github.com/PriyanshuG27/Fitdesi.git
cd Fitdesi

# 2. Install dependencies (Client & Backend)
npm install
cd functions && npm install && cd ..

# 3. Ignite the Emulators & Client
firebase emulators:start
npm run dev
```

> **Warning:** You must configure your `.env` and `.env.local` files with your Firebase and Gemini credentials before running. See the `docs/` folder for the exact blueprint.

---

## 📖 Deep-Dive Reference Docs

* 📄 [Product Requirements Document (PRD)](./docs/PRD.md)
* 📄 [Technical Requirements Document (TRD)](./docs/TRD.md)
* 📄 [UI/UX Design Specification Brief](./docs/UI_UX_BRIEF.md)
* 📄 [Environment Configuration Guide](./docs/ENV_CONFIG.md)

---
<div align="center">
  <i>"Discipline equals freedom."</i> <br/>
  <b>Built for the Comeback. Built for FitDesi.</b>
</div>
