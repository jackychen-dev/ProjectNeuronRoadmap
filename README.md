# Project Neuron Roadmap

A production-grade roadmap management web app emphasizing **accountability + creativity**.

## Data Model Hierarchy

```
Initiative (top-level project)        → Prisma: Program
  └── Workstream                      → Prisma: Workstream
      └── Subcomponent                → Prisma: Initiative
          └── Subtask (points source) → Prisma: SubTask
```

**Key rule**: Story points exist ONLY on Subtasks. All higher levels compute points automatically via rollup.

## Features

- **Roadmap**: Gantt timeline with workstreams and subcomponents (FY26-FY28)
- **Initiatives**: Multiple top-level initiatives with "Add Initiative" on Roadmap and Workstreams
- **Burndown**: Snapshot-based burndown charts (date-over-date, no straight-line averaging)
- **Progress Bars**: Dual "Last Saved %" vs "Current %" per Initiative
- **Owner Dashboard**: Personalized view showing only items assigned to the logged-in user
- **Documentation**: Create/edit docs attached to any entity (Initiative/Workstream/Subcomponent)
- **Open Issues**: Issue tracking with comment threads and reply notifications
- **CSV Export**: Export all entities (initiatives, workstreams, subcomponents, subtasks, snapshots, users, issues, docs)
- **Owner Assignment**: Assign subcomponents to users for accountability
- **Auth**: NextAuth with email/password, ADMIN/MEMBER roles

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + custom shadcn/ui-style components
- **PostgreSQL** + **Prisma ORM**
- **NextAuth** for authentication
- **Recharts** for charts (burndown, delivery metrics)
- **Zod** for validation
- **Vitest** for testing

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 16 (local or Docker)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL (Docker or local)
docker compose up -d  # OR use locally installed PostgreSQL

# 3. Run database migrations
npx prisma migrate dev

# 4. Seed the database
npm run db:seed

# 5. Start development server
npm run dev
```

### Default Credentials

| Role   | Email              | Password     |
|--------|--------------------|--------------|
| Admin  | admin@neuron.dev   | password123  |
| Member | member@neuron.dev  | password123  |

## How Snapshots Work

Snapshots are the source of truth for the burndown chart. Each snapshot captures a point-in-time view of progress.

1. **Creating snapshots**: Click "Save Snapshot" on an Initiative card (Roadmap page) or "Push to Update Burn Chart" (Burndown page).
2. **Idempotent per day**: If you save a snapshot for the same Initiative on the same date, it overwrites (upserts) rather than creating a duplicate. This uses a unique constraint on `(programId, date)`.
3. **What gets captured**: `totalPoints` (sum of all subtask points) and `completedPoints` (sum of points where subtask status = DONE) at that moment.
4. **Burndown chart rendering**: The orange "current" line plots actual snapshot values date-over-date. No interpolation — gaps between snapshot dates are shown as gaps. If today has no snapshot, a distinct "Today (unsaved)" point shows live computed progress.
5. **Scope change detection**: If `totalPoints` changes between consecutive snapshots (new subtasks added), a "Scope Changed" warning badge appears.
6. **Remaining points**: Computed as `snapshot.totalPoints - snapshot.completedPoints` for each snapshot date.

## How Owner Filtering Works

1. **Assigning owners**: In the Workstream detail page, expand a Subcomponent and use the "Assigned User" dropdown to assign a user as owner (`ownerId`).
2. **My Dashboard** (`/my-dashboard`): Shows only subcomponents where `ownerId` matches the logged-in user. Displays personalized stats, progress bars, and open issues.
3. **Permissions**: MEMBER users can edit items assigned to them. ADMIN users can edit all items.
4. **Issue notifications**: The My Dashboard shows issues related to the user's subcomponents, with "New Reply" badges for unseen comments. This uses the `UserIssueSeen` model which tracks `lastSeenAt` per user per issue.

## How to Export CSV

Navigate to `/api/export?entity=<entity_name>` or use the Export buttons in the UI.

Supported entities:
- `programs` — Top-level initiatives
- `initiatives` — Subcomponents (name, workstream, category, status, dates, owner)
- `workstreams` — Workstreams with program association
- `subtasks` — All subtasks with points, status, estimation data
- `snapshots` — Burn snapshot history
- `users` — User accounts (email, name, role)
- `open-issues` — Issues with severity, comments count
- `docs` — Documentation entries
- `milestones` — Milestones with dates
- `partners` — Partner organizations
- `assignments` — Resource assignments

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Protected app routes
│   │   ├── my-dashboard/   # Owner-filtered personalized dashboard
│   │   ├── dashboard/      # Program-wide dashboard
│   │   ├── roadmap/        # Gantt timeline + Add Initiative
│   │   ├── burndown/       # Snapshot-based burndown charts
│   │   ├── workstreams/    # Workstream detail pages + owner assignment
│   │   ├── docs/           # Documentation CRUD
│   │   ├── open-issues/    # Issue tracking with replies
│   │   ├── deliverables/   # All subcomponents table
│   │   └── ...
│   ├── auth/               # Sign in page
│   └── api/                # API routes (auth, export)
├── components/             # Shared UI components
├── lib/
│   ├── actions/            # Server actions
│   │   ├── snapshots.ts    # Burn snapshot CRUD + upsert
│   │   ├── documentation.ts # Documentation CRUD
│   │   ├── program.ts      # Initiative (Program) CRUD
│   │   ├── initiatives.ts  # Subcomponent CRUD + owner assignment
│   │   ├── subtasks.ts     # Subtask CRUD
│   │   └── open-issues.ts  # Issues + notification tracking
│   ├── rollup.ts           # Shared rollup calculation functions
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma client
│   └── validations.ts      # Zod schemas
├── types/                  # TypeScript declarations
└── lib/__tests__/          # Vitest tests
    ├── rollup.test.ts      # Rollup calculation tests (12 tests)
    ├── snapshot-idempotency.test.ts  # Snapshot upsert tests (3 tests)
    └── csv-export.test.ts  # CSV formatting tests (7 tests)
```

## Running Tests

```bash
npx vitest run           # Run all tests once
npx vitest               # Run in watch mode
```

## Environment Variables

```env
DATABASE_URL="postgresql://neuron:neuron@localhost:5432/neuron_roadmap"
NEXTAUTH_SECRET="change-me-to-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```
