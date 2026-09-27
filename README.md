# Arcane Companion — D&D Virtual Tabletop Suite

Arcane Companion is a real-time web application designed for tabletop role-playing games (TTRPG), specifically tailored for Dungeons & Dragons (5e / homebrew). It provides Game Masters (GM) and players with a synchronized dashboard for character management, combat tracking, shared party inventory, and encounter utilities.

---

## Key Features

### 1. Party Hub and Character Management
- **Role-Based Access Control**: Separate interfaces and permissions for Game Masters and Players. Players can claim or manage their designated character, while the GM retains authority over party configuration, ownership assignments, and campaign data.
- **Comprehensive Character Sheet**: Full management of character identity (Name, Level, Race, Class, Alignment, Background), combat vitals (Current HP, Max HP, AC, Initiative), and core attributes (ATK, INT, CHA, STR, DEX, CON, WIS, and arbitrary custom attributes).
- **Automated Stat Modifiers**: Real-time recalculation of equipment and skill bonuses. Equipping weapons, armor, or triggering active feats automatically computes final attribute values without manual calculation.
- **Custom Avatar Integration**: Client-side canvas image downscaling and compression system that converts uploaded images or direct URLs into lightweight, synchronized WebP representations under 30KB.
- **Gold Tracking**: Individual character wealth management with audit-ready increment/decrement controls.

### 2. Shared Inventory (Bag of Holding)
- **Shared Party Storage**: Real-time synchronized collective inventory accessible to all party members.
- **Granular Quantity Transfers**: Flexible item movement between the Bag of Holding and individual character inventories, supporting specific transfer quantities via input or stepper controls.
- **Consumable and Interactive Items**: Items can trigger immediate programmatic effects upon use, including direct HP healing and applying multi-stat condition effects.
- **Rarity Tiering**: Standardized rarity classifications (Common, Uncommon, Rare, Epic, Legendary) with color-coded visual hierarchy.

### 3. Combat Tracker and Initiative Engine
- **Turn and Round Automation**: Initiative order management with automated turn progression and full round / phase cycling.
- **Dynamic Status Effect Engine**: Support for timed and indefinite status conditions. Effects support multiple simultaneous stat modifiers (e.g., boosting HP and ATK while penalizing AC) as well as turn-by-turn tick damage or healing.
- **Combatant Status Indicators**: Visual indicators for healthy, critical, dying, and unconscious/dead combatants with automated HP bounds checking.

### 4. Probability and Encounter Tools
- **Digital Dice Engine**: Virtual dice roller with presets (d4, d6, d8, d10, d12, d20, d100) powered by procedural Web Audio API sound synthesis, requiring zero external audio assets.
- **Probability Visualizer and Slot Roller**: Mechanics for fortune checks, random encounter resolutions, and fortune spinning.
- **Loot Table Generation**: Random encounter treasure drop generation with tiered item pools.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) with real-time Firebase Firestore synchronizers (`onSnapshot`)
- **Backend / Database**: [Google Firebase](https://firebase.google.com/) (Firestore & Authentication)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom arcane glassmorphism design tokens
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio**: Web Audio API (procedural synthesis for dice rolls and UI interactions)

---

## Project Structure

```text
dnd-apps/
├── src/
│   ├── app/
│   │   ├── gm/
│   │   │   ├── combat/          # Combat tracker and initiative order
│   │   │   ├── inventory/       # Bag of Holding & party storage
│   │   │   ├── loot/            # Loot drop and treasure tables
│   │   │   ├── party/           # Party hub & character roster
│   │   │   ├── probability/     # Dice roller and slot mechanics
│   │   │   ├── settings/        # Campaign and display preferences
│   │   │   └── page.tsx         # GM control center dashboard
│   │   ├── login/               # Authentication & role switcher
│   │   ├── globals.css          # Design system variables & custom tokens
│   │   ├── layout.tsx           # Global app shell and font configuration
│   │   └── page.tsx             # Root redirect / landing entrypoint
│   ├── components/
│   │   ├── combat/              # Combatant cards and action menus
│   │   ├── layout/              # Topbar, navigation, and sidebar components
│   │   ├── party/               # Character card, sheet modal, and bag components
│   │   └── providers/           # Context providers and synchronization wrappers
│   ├── lib/
│   │   ├── firebase.ts          # Firebase SDK initialization
│   │   ├── image-utils.ts       # Canvas image resizer and data URL optimizer
│   │   ├── sounds.ts            # Web Audio API sound generators
│   │   └── types.ts             # Domain models, schema definitions, and helpers
│   └── stores/
│       ├── auth-store.ts        # User credentials and session state
│       ├── character-store.ts   # Party characters, equipment, and shared bag state
│       └── combat-store.ts      # Active combatants, turns, and encounter tracker
├── public/                      # Static assets and favicons
├── .env.local                   # Environment variables (Firebase credentials)
├── package.json                 # Project dependencies and script definitions
└── tsconfig.json                # TypeScript compiler configuration
```

---

## Getting Started

### Prerequisites
- Node.js (version 18.18.0 or higher recommended)
- npm, yarn, or pnpm

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/dnd-apps.git
cd dnd-apps
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables Configuration
Create a `.env.local` file in the root directory and supply your Firebase project credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"
```

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js local development server with Turbopack / hot reloading. |
| `npm run build` | Compiles and optimizes the production build. |
| `npm run start` | Runs the compiled production server. |
| `npm run lint` | Runs ESLint analysis across TypeScript and React code. |

---

## Architecture and Data Synchronization

1. **Reactive Store Architecture**: Client state is powered by Zustand stores (`useCharacterStore`, `useCombatStore`, `useAuthStore`).
2. **Real-Time Data Pipeline**: Firestore `onSnapshot` listeners maintain bi-directional synchronization between all connected GM and Player clients.
3. **Optimistic & Safe Updates**: Operations strip `undefined` fields recursively before submitting mutations to Firestore, avoiding invalid payload errors.
4. **Dynamic Bonus Calculation**: Calculations for Armor Class, Maximum HP, and Attribute modifiers are computed through centralized pure helper functions (`recalculateCharacterBonuses`, `getCharacterAC`, `getCharacterMaxHp`), ensuring consistent values across cards, modals, and combat lists.

---

## License

This project is licensed under the MIT License.
