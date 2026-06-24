# Dallmayr SA Operations Portal: Agent Directives & Code Conventions

This document contains persistent development rules, styling standards, and system constraints for AI agents and engineering contributors working on the **Inhouse Stock** codebase.

## 1. Absolute Scope Discipline
- **Respect User Intent**: Build exactly what is requested. Never add unrequested features, decorative status logs, or mock telemetry feeds in page margins.
- **Single-View Simplicity**: Simple tasks must reside in simple, elegant single-screen structures. Avoid multi-tab panels or persistent sidebars unless building full-scale feature systems.
- **Architectural Honesty**: Keep typography, contrast, and spacing clean. Avoid adding decorative tech clutter such as simulated terminal lines (`"CORE NODE ONLINE"`, `"PORT 3000 LIVE"`). Use clean, humble, literal labels (e.g., "Current System Time" instead of `"Chronos Coordinate Finder"`).

## 2. Visual Theme & Layout Pairing
- **Primary Theme**: A restrained, high-contrast, premium light/dark scheme utilizing Dallmayr-inspired gold (`#D4AF37`) as a subtle highlight color against neutral slate (`#111111`) or off-white.
- **Typography Pairing**:
  - *Display Headings*: Space Grotesk / Inter (tracking-tight, medium/bold weight).
  - *Technical/Operational Data*: JetBrains Mono (monospaced tracking for numbers, barcodes, timestamps).
- **Interactive States**: Hover states must be distinct (e.g., `hover:bg-amber-500/10`, transition periods between 150-200ms).
- **Touch Targets**: Mobile views must preserve clickable touch zones of at least `44px` in size for field technicians wearing gloves.

## 3. Strict Code & Type Constraints
- **Zero tsc Warnings**: TypeScript strict mode is enabled. Never use explicit `any` types or unsafe type assertions. Always define precise domain types or use generated database schemas.
- **No Large Component Monoliths**: Never consolidate all logic into a single file (e.g. `App.tsx` or `index.tsx`). Split codes into modular domain modules (`src/features/*/repository.ts`, `src/components/ui/`, etc.).
- **React 18/19 & Vite Standards**: Use functional components, custom hooks, and correct dependency structures. Ensure all `useEffect` hooks depend strictly on primitive types to avoid infinite re-render loops.
- **Zero Mock Fallbacks**: Real database bindings (Supabase / local configurations) must be integrated directly. Do not implement simulated API delays or mock database arrays if DB bindings can be created.

## 4. Supabase Integration & RLS
- **Derive User Identities**: Never trust client-provided `user_id` values in mutations. Always resolve identities inside PostgreSQL rules using `auth.uid()`.
- **Verify RLS Presence**: Every added table must explicitly execute `ALTER TABLE ENABLE ROW LEVEL SECURITY;` along with associated SELECT, INSERT, UPDATE, and DELETE policies.
