# 🏋️ Gym Tracker

Personal gym tracker focused on **progressive overload**: log your routines, the exercises for each day and
your sessions, and every week it tells you where you improved on each exercise (more weight, more reps, both or
more volume).

- **SvelteKit** (Svelte 5 runes) + **TypeScript**
- **MongoDB** (official driver)
- **Bun** as runtime / package manager
- **Tailwind 4**, dark theme (yellow + grays/blacks), minimalist, mobile-first
- **Dockerfile** ready to deploy on **Coolify**
- **Multi-user auth**: username + password, admin-managed accounts — every user's exercises, routines, calendar and sessions are fully separated.

## How progressive overload works

For each exercise, we group your sets by **week** and compute:

- **Volume** = Σ (weight × reps) of all sets.
- **e1RM (estimated 1RM)** = the **average of five validated formulas** (Epley, Brzycki, Lombardi, Lander, O'Conner), taken from your best set of the week. Averaging cancels each formula's individual bias, and reps are only trusted up to ~12 (beyond that the estimate is clamped, since accuracy drops sharply). Most accurate at 3–8 reps.
- **Top set** = your best set (heaviest weight, and the reps at that weight).

We compare the latest week against the previous one and give you a verdict: **more weight**, **more reps**, **both**,
**more volume**, same or down.

## Accounts & data isolation

Sign in with a **username + password**. There is no public sign-up: the **admin** creates every account from
inside the app. Each account gets its own private set of exercises, routines, weekly calendar and sessions —
nothing is shared between users.

- **Admin account** is seeded on first start from `ADMIN_USERNAME` / `ADMIN_PASSWORD` (defaults:
  `alexioficial` / `1029384756`). The seed only creates the admin if it doesn't exist — it never overwrites an
  existing password, so change it safely afterwards.
- **Managing users**: signed in as the admin, open the **Users** panel (people icon, top-right → `/admin`) to
  create users, reset their password, or delete them. Usernames may only contain **lowercase letters, numbers,
  dots and underscores** (3–30 chars).
- **Migrating the old single-user data**: the pre-accounts data is automatically claimed by the admin account
  on first start.
- **Staying signed in**: the session lasts 365 days (persistent, http-only, signed cookie backed by an
  `auth_sessions` document), so you don't re-enter credentials each visit. Logging out truly revokes access.
  Passwords are hashed with `scrypt`.

## Local development

Requirements: [Bun](https://bun.sh) and a MongoDB instance (free Atlas cluster, or a local Mongo).

```bash
# 1. Install dependencies
bun install

# 2. Environment variables
cp .env.example .env
# edit .env with your MONGODB_URI and SESSION_SECRET

# 3. Start in dev mode
bun run dev
```

Open http://localhost:5173 and sign in as the admin (`alexioficial` / `1029384756` by default), then create
more users from the **Users** panel.

Type checking: `bun run check`

## Environment variables

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. |
| `MONGODB_DB` | Database name (e.g. `gym_tracker`). |
| `SESSION_SECRET` | Secret used to sign the session cookie (`openssl rand -hex 32`). |
| `ORIGIN` | Public URL. **Required in production** for form actions (CSRF). |
| `ADMIN_USERNAME` | Optional. Seeded admin username (default `alexioficial`). |
| `ADMIN_PASSWORD` | Optional. Seeded admin password (default `1029384756`). Only used when creating the admin. |
| `PORT` | Server port (defaults to 3000). |

## Deploy on Coolify

1. Push this project to a GitHub repo.
2. In Coolify create an application from that repo and switch the **Build Pack** from Nixpacks to **Dockerfile** (uses the `Dockerfile` at the root).
3. Set the environment variables from the table above. `ORIGIN` must be the final URL with `https://` (e.g. `https://gym.yourdomain.com`).
4. The app listens on port **3000** (already exposed in the Dockerfile).
5. For `MONGODB_URI` use a MongoDB Atlas cluster or a MongoDB service created within the same Coolify.

## Production build (local)

```bash
docker build -t gym-tracker .
docker run --rm -p 3000:3000 --env-file .env gym-tracker
```
