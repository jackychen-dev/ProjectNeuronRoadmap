# 🧠 Project Neuron Roadmap

A production-grade roadmap management web app emphasizing **accountability + creativity**.

## Features

- **Roadmap**: Themes → Feature Groups → Features with timeline view
- **Goals**: Quarterly goals with release targets and feature rollups
- **Burndown + Tracking**: Burndown charts, checklists, or milestones (per entity)
- **Issues**: Cyclical state machine (TRIAGE → INVESTIGATING → IN_PROGRESS → VERIFYING → DONE)
- **Resources**: Owner/Mid/Senior resource buckets with capacity tracking
- **Assignments**: Weekly hours planned/actual with overload warnings
- **Cost Tracking**: Direct costs + computed labor costs from assignments
- **CSV Export**: Export any entity to CSV
- **Archive/Soft Delete**: Archive items instead of deleting them
- **Auth**: NextAuth with email/password, ADMIN/MEMBER roles

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + custom shadcn/ui-style components
- **PostgreSQL** + **Prisma ORM**
- **NextAuth** for authentication
- **Recharts** for charts (burndown, capacity, cost)
- **Zod** for validation

## Quick Start

### Prerequisites

- Node.js 18+
- Docker (for PostgreSQL)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Run database migrations
npx prisma migrate dev --name init

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

## Project Structure

```
src/
├── app/
│   ├── (app)/           # Protected app routes
│   │   ├── dashboard/   # Main dashboard
│   │   ├── roadmap/     # Theme/Feature Group/Feature view
│   │   ├── features/    # Feature CRUD + table
│   │   ├── goals/       # Quarterly goals + rollups
│   │   ├── burndown/    # Burndown/Checklist/Milestone tracking
│   │   ├── issues/      # Issue tracking with cyclical state
│   │   ├── resources/   # Resource & team management
│   │   ├── assignments/ # Weekly assignments
│   │   ├── cost/        # Cost tracking & charts
│   │   └── admin/       # User & team administration
│   ├── auth/            # Sign in page
│   └── api/             # API routes (auth, export)
├── components/          # Shared UI components
├── lib/
│   ├── actions/         # Server actions (CRUD)
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma client
│   ├── utils.ts         # Utility functions
│   └── validations.ts   # Zod schemas
└── types/               # TypeScript declarations
prisma/
├── schema.prisma        # Database schema
└── seed.ts              # Seed data
```

## Tracking Modes

Each Feature and Goal supports three tracking modes:

1. **BURNDOWN**: Weekly snapshots of remaining work, visualized as a line chart
2. **CHECKLIST**: Simple checklist items with completion percentage
3. **MILESTONES**: Date-based milestones with completion tracking

The UI gracefully switches visualization based on the selected mode.

## Environment Variables

```env
DATABASE_URL="postgresql://neuron:neuron@localhost:5432/neuron_roadmap"
NEXTAUTH_SECRET="change-me-to-a-random-secret"
NEXTAUTH_URL="http://localhost:3000"
```

