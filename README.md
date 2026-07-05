# vacansee-au

Real-time room availability for the University of Wollongong (UOW).
It pulls the public SOLSS timetable across every UOW campus, normalises it
into a queryable schedule, and exposes search / browse / visualisation over
the result.

## What it does

- **Now / Soon** - shows rooms currently free and rooms that free up in
  the next hour, filtered to the current day + session block.
- **Check** - ad-hoc availability query: pick a room + time window, get
  back whether it is free and what sits on either side.
- **Rooms** - directory of every timetabled space with capacity + code.
- **Graph** / **Custom graph** - weekly occupancy heatmap per room,
  filterable by weekday, room subset, and session blocks.
- **Profile** - Microsoft Entra SSO via Supabase; maintains
  `time_format` preference (12h / 24h) and dismissed-onboarding flags.

## Architecture

```
+-----------------------------------+      +-----------------------------+
| GitHub Actions                    |      | SOLSS public API            |
|  - update-timetable.yml (daily)   | ---> |   (no authentication)       |
|    - scrape_timetable.py          |      |   all UOW campuses          |
|    - upload_timetable.py          |      +-----------------------------+
|    - generate_schedule.py         | ---> +-----------------------------+
+-----------------------------------+      | Supabase Postgres           |
            |                              |   Rooms / Timings           |
            | writes public/classes.csv    +-----------------------------+
            | writes public/scheduleData.json
            v
+-----------------------------------+      +-----------------------------+
| Next.js App Router                | <--- | Supabase Auth (Entra SSO)   |
|  - /api/* route handlers          |      +-----------------------------+
|  - Vercel serverless + proxy      |
+-----------------------------------+
```

## Tech stack

| Layer    | Choice                                                                 |
| -------- | ---------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind, Framer Motion |
| Auth     | Supabase (`@supabase/ssr`) on Microsoft Entra SSO                      |
| DB ORM   | Prisma 7 (+ `@prisma/adapter-pg`) -> Supabase Postgres                 |
| Proxy    | `src/proxy.ts` for session refresh + maintenance mode                  |
| Scraper  | Python + `requests` against the public SOLSS API                       |
| CI       | GitHub Actions (daily cron + workflow_dispatch)                        |
| Hosting  | Vercel                                                                 |

## Repository layout

```
├─ prisma/
│  └─ schema.prisma            Rooms / Timings
├─ public/
│  ├─ classes.csv              Scraper output (one row per meeting date)
│  ├─ raw/                     Per-campus SOLSS JSON (committed by CI)
│  └─ scheduleData.json        Pre-aggregated weekly heatmap data
├─ scripts/                    Python scraper + CI helpers
│  ├─ scrape_timetable.py      Public SOLSS scraper (all campuses)
│  ├─ academic_calendar.py     UOW key dates + non-standard PDF parser
│  ├─ resolve_weeks.py         Week-number → calendar date resolver
│  ├─ upload_timetable.py      CSV -> Postgres via Prisma schema
│  ├─ update_rooms.py          Sync Rooms table with timetable
│  ├─ generate_schedule.py     Rebuild scheduleData.json
│  ├─ db_connection.py         Shared Supabase client
│  ├─ restore_db.sh            Interactive restore from a backup dump
│  └─ requirements.txt
├─ src/
│  ├─ app/                     Next.js App Router
│  │  ├─ api/                  Route handlers (Prisma queries)
│  │  ├─ auth/login/           Login page
│  │  └─ layout.tsx            Root layout + providers
│  ├─ views/                   Client page components
│  ├─ components/              UI + layout + widgets
│  ├─ hooks/                   useRequireAuth, useUserPreferences
│  ├─ lib/supabase/            Browser / server / middleware clients
│  └─ proxy.ts                 Session refresh + maintenance mode
└─ .github/workflows/
   ├─ update-timetable.yml     Scrape + upload + regen (every 20 min)
   ├─ ping-supabase.yml        Keep-alive ping for free-tier DB
   └─ backup-database.yml      Daily pg_dump -> vacansee-db-backups
```

## Getting started

Requires Node 20+, Python 3.12+, and a Supabase project.

```bash
git clone https://github.com/tahayparker/vacansee-au.git
cd vacansee-au
npm install
```

Copy `.env.example` to `.env.local` and fill the Supabase credentials:

```
DATABASE_URL=                          # Supabase pooled connection string
DIRECT_URL=                            # Supabase direct (Prisma migrations)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # falls back to the anon key
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Seed the schema + run dev:

```bash
npx prisma generate
npm run dev
```

Opens at `http://localhost:3000`.

## Running the scraper locally

The SOLSS scraper is public - no credentials or browser automation required.

```bash
python -m venv .venv
source .venv/bin/activate         # on Windows: .venv\Scripts\activate
pip install -r scripts/requirements.txt

python scripts/scrape_timetable.py \
  --output public/classes.csv \
  --raw-dir public/raw
```

Flags:

- `--output` - CSV output path (default `public/classes.csv`).
- `--raw-dir` - directory for per-campus raw JSON (default: same dir as `--output`).
- `--last-run-file` - SOLSS publish-date cache (default `last_run.txt`).
- `--calendar-cache-file` - academic calendar cache (default `academic_calendar_cache.json`, 7-day TTL).
- `--force` - scrape even if the SOLSS publish date is unchanged.

Each class is expanded to one row per actual meeting date (`Date` column,
ISO `YYYY-MM-DD`). Week numbers are resolved at scrape time using UOW's key
dates page and non-standard sessions PDF (cached for up to a week).

The scraper records the SOLSS publish date in `last_run.txt` (tracked in git,
updated on each data commit). On the next run it compares the live publish
date against that value and skips the full multi-campus crawl when nothing
has changed.

Raw SOLSS JSON is written to `public/raw/raw_timetable_<campus>.json` and
committed alongside the CSV when data changes.

## Automated data refresh

[`.github/workflows/update-timetable.yml`](.github/workflows/update-timetable.yml)
runs every 20 minutes (`*/20 * * * *`) and on `workflow_dispatch`. It caches
`academic_calendar_cache.json` via `actions/cache` (gitignored, 7-day TTL).
The SOLSS publish-date gate reads `last_run.txt`, which is **committed to the
repo** whenever timetable data changes so every run knows the last scrape
without relying on ephemeral cache. The scraper runs the full multi-campus
crawl only when SOLSS data actually changes; otherwise it exits after a
cheap preload check.

## Database schema

```prisma
model Rooms {
  id        Int    @id @default(autoincrement())
  Name      String
  ShortCode String
  Capacity  Int?

  @@index([ShortCode])
  @@index([Name])
  @@map("AU-Rooms")
}

model Timings {
  id        Int    @id @default(autoincrement())
  SubCode   String
  Class     String
  Day       String
  StartTime String
  EndTime   String
  Room      String
  Date      String @default("")
  Campus    String @default("")

  @@index([Day, StartTime, EndTime])
  @@index([Date, StartTime, EndTime])
  @@index([Room])
  @@index([Date, Room])
  @@index([Day])
  @@index([Campus])
  @@map("AU-Timings")
}
```

This app shares a Supabase project with the Dubai `vacansee` deployment,
so every table is namespaced with an `AU-` prefix (`AU-Rooms`,
`AU-Timings`) via Prisma `@@map`. The Dubai-era `Rooms`/`Timings` tables in
the same project are left untouched.

`Rooms.Name` (canonical) and `Rooms.ShortCode` are resolved against each
other at scrape time. `Campus` carries the originating UOW campus so
queries can scope availability to a single site.

## API routes

| Method | Route                     | Purpose                                        |
| ------ | ------------------------- | ---------------------------------------------- |
| `GET`  | `/api/rooms`              | List rooms with capacity + short code          |
| `GET`  | `/api/available-now`      | Rooms free at the current minute               |
| `GET`  | `/api/available-soon`     | Rooms freeing up within the next hour          |
| `POST` | `/api/check-availability` | Point-in-time availability for a room + window |
| `GET`  | `/api/schedule`           | Static pre-aggregated weekly heatmap           |
| `GET`  | `/api/auth/callback`      | Supabase OAuth callback handler                |

All `/api/*` except `/api/auth/callback` require an authenticated session
(enforced by `src/proxy.ts`).

## Database backups

[`.github/workflows/backup-database.yml`](.github/workflows/backup-database.yml)
runs daily at 02:00 UTC and snapshots the `public` schema via `pg_dump`
into [tahayparker/vacansee-db-backups](https://github.com/tahayparker/vacansee-db-backups)
as `backups/YYYY-MM-DD.sql.gz` (+ a `latest.sql.gz` pointer). Retention is
90 days — older files are pruned before each commit.

Restore a dump with [`scripts/restore_db.sh`](scripts/restore_db.sh):

```bash
export DIRECT_URL="postgresql://postgres.XXXX:[PASSWORD]@aws-0-....pooler.supabase.com:5432/postgres"
bash scripts/restore_db.sh /path/to/backup.sql.gz
```

The script prints the dump header + object summary, prompts for explicit
`restore` confirmation, and applies the dump in a single transaction with
`ON_ERROR_STOP=on` so partial failures roll back.

## Deployment

Push to `main` on GitHub -> Vercel rebuilds automatically. CI-authored
commits tagged `[skip deploy]` (`scripts/ignore-build-step.js`) skip the
rebuild since they only change data files already baked into the running
build at request time.

## Contributing

Fork, branch, submit a PR. Keep PRs focused - one concern per branch.
Run `npm run lint` and `npm run build` before submitting. Conventional
Commits preferred for subject lines.
