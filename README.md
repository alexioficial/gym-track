# 🏋️ Gym Tracker

Personal gym tracker focused on **progressive overload**: log your routines, the exercises for each day and
your sessions, and every week it tells you where you improved on each exercise (more weight, more reps, both or
more volume).

- **SvelteKit** (Svelte 5 runes) + **TypeScript**
- **MongoDB** (official driver)
- **Bun** as runtime / package manager
- **Tailwind 4**, dark theme (yellow + grays/blacks), minimalist, mobile-first
- **Dockerfile** ready to deploy on **Coolify**
- **PIN** protection (single user)

## How progressive overload works

For each exercise, we group your sets by **week** and compute:

- **Volume** = Σ (weight × reps) of all sets.
- **e1RM (estimated 1RM)** = the **average of five validated formulas** (Epley, Brzycki, Lombardi, Lander, O'Conner), taken from your best set of the week. Averaging cancels each formula's individual bias, and reps are only trusted up to ~12 (beyond that the estimate is clamped, since accuracy drops sharply). Most accurate at 3–8 reps.
- **Top set** = your best set (heaviest weight, and the reps at that weight).

We compare the latest week against the previous one and give you a verdict: **more weight**, **more reps**, **both**,
**more volume**, same or down.

## Local development

Requirements: [Bun](https://bun.sh) and a MongoDB instance (free Atlas cluster, or a local Mongo).

```bash
# 1. Install dependencies
bun install

# 2. Environment variables
cp .env.example .env
# edit .env with your MONGODB_URI, AUTH_PIN and SESSION_SECRET

# 3. Start in dev mode
bun run dev
```

Open http://localhost:5173, sign in with your `AUTH_PIN` and start logging.

Type checking: `bun run check`

## Environment variables

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string. |
| `MONGODB_DB` | Database name (e.g. `gym_tracker`). |
| `AUTH_PIN` | PIN/password to sign in. |
| `SESSION_SECRET` | Secret used to sign the session cookie (`openssl rand -hex 32`). |
| `ORIGIN` | Public URL. **Required in production** for form actions (CSRF). |
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
