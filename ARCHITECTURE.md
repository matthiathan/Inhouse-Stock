# INHOUSE STOCK: Enterprise Operations Platform Architecture

## 1. System Architecture

**INHOUSE STOCK** is designed as a modern, reactive, mobile-first Single Page Application (SPA), adopting an API-driven cloud backend.

*   **Presentation Layer**: React 18 (Vite) utilizing functional components and hooks. Tailwind CSS handles responsive styling, ensuring consistent cross-device performance (specifically tailored for rugged mobile devices used by field techs).
*   **State Management Layer**: 
    *   *Server State*: TanStack Query (React Query) for data fetching, caching, synchronization, optimistic updates, and background refetching.
    *   *Client State*: React Context API / Zustand for global UI state (auth, drawer state, theme, scanner availability).
*   **Service & Integration Layer**: 
    *   *Repository Pattern*: Wraps Supabase API calls. Isolates the frontend from direct database queries, allowing validation (Zod) and transformation before data hits the UI components.
    *   *Offline Sync Queue*: IndexedDB wrapper (via local storage utilities) queueing mutations when the technician is offline and syncing opportunistically when connection is restored.
*   **Backend & Data Layer**: Supabase (PostgreSQL). Handling row-level security (RLS), real-time subscriptions, edge functions for webhooks/third-party API integrations (e.g., Nayax, Payment Gateways), and cloud storage for asset photos/signatures.

## 2. Folder Structure

We use a feature-based architecture pattern, avoiding monolithic directories to improve code splitting, discoverability, and testability.

```text
/src
├── assets/                 # Static assets, branding, global icons
├── components/             # Global, reusable UI components (Buttons, Inputs, Modals, Cards)
│   ├── layout/             # Sidebar, Header, MobileDrawer
│   ├── ui/                 # Headless UI implementations / base Tailwind components
│   └── scanner/            # Barcode/QR Camera interfaces (html5-qrcode wrappers)
├── features/               # Domain-specific modules (Feature-Sliced Design approach)
│   ├── assets/             # Machine & asset tracking
│   ├── customers/          # Client CRM logic
│   ├── dispatch/           # Service Call Log (SCL), ticketing, routing
│   ├── inventory/          # Warehouse stock, SKUs, bins
│   └── orders/             # Order fulfillment, packing
│       ├── components/     # Feature-specific components
│       ├── hooks.ts        # TanStack query hooks for this domain
│       └── repository.ts   # Supabase DB operations and DTOs
├── hooks/                  # Global utility hooks (useAuth, useOffline, useGeolocation)
├── lib/                    # Third-party instance initializations
│   ├── supabase.ts         # Supabase client singleton
│   └── queryClient.ts      # TanStack query configuration
├── pages/                  # Route-level components mapping directly to URLs
├── services/               # External APIs, third-party integrations
│   └── api/                
│       └── wallet/         # Payment Gateway integrations (Stitch, Paystack)
├── types/                  # Global TypeScript enums, interfaces, Domain Models (Zod schemas)
├── utils/                  # Pure functions (date formatters, sync queues, state machines)
├── App.tsx                 # Root component, Context Providers, Router definition
└── main.tsx                # Vite entry point
```

## 3. Database Relationships

A unified PostgreSQL schema via Supabase.

*   `users` (1) ── (M) `service_call_logs` (Tech Assignment)
*   `customers` (1) ── (M) `machines` (Assets at client sites)
*   `customers` (1) ── (M) `service_call_logs` (Tickets per client)
*   `machines` (1) ── (M) `service_call_logs` (History per machine/asset)
*   `orders` (1) ── (M) `order_items` (Fulfillment packing slip)
*   `order_items` (M) ── (1) `stock_items` (SKU reference)
*   `machines` (1) ── (M) `orders` (Consumables ordered *for* a specific asset)

**Key Security Design**: 
Row-Level Security (RLS) policies segment visibility by `region` (e.g., KZN, JHB, CPT) and `role` (Admin/Finance read all, Tech reads own region).

## 4. Feature Breakdown

1.  **Identity & Security**: Role-based access control (Admin, Warehouse, Tech, Finance, Ops), region clustering, secure session management.
2.  **Warehouse & Inventory**: Master stock lookup, quick-scan fulfillment, linear single-aisle packing interface, low-stock threshold alerts.
3.  **Asset Management**: Central machine registry, QR generation per machine, site assignment, warranty tracking, historical service ledgers.
4.  **Dispatch & Field Service (SCL)**: Technician routing queues, Service Call Log mapping, SLA prioritization, photo-verified closures, geolocation validation.
5.  **Analytics & Finance Auditing**: Real-time reconciliation of closed tickets, billable extraction, consumed stock tracking.
6.  **Edge / Integrations**: Wallet service boilerplate (South African gateways like Paystack, Stitch) handling B2C cashless machine operation via Nayax telemetry.

## 5. Migration Plan

*   **Phase 1: Standardization**. Establish the repository pattern. Migrate existing DB calls embedded in UI components out to `/features/*/repository.ts`.
*   **Phase 2: Data Hooks**. Replace manual `useEffect` fetching with TanStack `useQuery` and `useMutation` to introduce smart caching, unified error boundaries, and loading states natively.
*   **Phase 3: Offline Mode**. Finalize the IndexedDB `offlineSync.ts` utility. Wrap core field actions (Task Closure, Stock Fulfillment) in offline-first mutation wrappers for field technicians.
*   **Phase 4: Atomic Components**. Unify the fragmented UI into a strict set of atomic components to ensure visual consistency across the varying toolsets and reduce duplicated UI code.
*   **Phase 5: Production Hardening**. Audit RLS policies on Supabase. Execute performance indexing on heavy queries (barcode matching, analytics). Clean testing and CI/CD pipelines.

## 6. UI Structure

*   **Desktop (Warehouse/Admin)**: Persistent left-hand sidebar navigation. Data-dense tables with sticky headers. Split-pane layouts for viewing details without losing list context.
*   **Mobile (Field Technician)**: Bottom navigation bar or accessible hamburger drawer. Large touch targets (min 44px). Floating Action Buttons (FAB) for device-native rapid barcode scanning. Card-based lists rather than horizontal tables. High-contrast offline status indicators.

## 7. Deployment Approach

*   **Frontend**: Hosted as a static artifact (Vite build) on Cloud Run / Vercel. Native support for CI/CD triggered on `main` branch merges.
*   **Database (Supabase)**: Managed PostgreSQL instances with Point-in-Time Recovery enabled. Automated nightly database dumps triggered via GitHub actions. 
*   **Environments**: 
    1.  *Development* (local/preview with mock/seed data).
    2.  *Staging* (mirrors production schema, sanitized data).
    3.  *Production* (Live environment with SLA-backed resources).
