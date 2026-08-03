# CodeBoard

CodeBoard is a personal, local web app for orchestrating [GitHub Copilot CLI](https://github.com/github/copilot-cli) coding tasks against your own repositories — define a task once (which repo, what prompt, which agent/model), then trigger it manually, on a cron schedule, from a GitHub webhook, or via an external API call, and watch it run with live streaming output, safe git branching, and a colored diff of the result.

It's a single Next.js process: the UI, the API routes, and the background cron scheduler all run together — there's no separate backend server to deploy.

## Features

- **Repos** — register a repo by local path or git URL (auto-clone/pull on demand), with a built-in folder browser and default-branch auto-detection.
- **Tasks** — define a prompt, target repo, optional agent/model, permission mode (`default` vs `--allow-all`), and output format (`text` or `json`) per task.
- **Triggers** — run a task manually from the UI, on a `node-cron` schedule, from a signed GitHub webhook, or via an API-token-protected external endpoint.
- **Live runs** — each execution streams the Copilot CLI's output live over SSE; `json`-format output is summarized into short, readable lines (tool calls, reasoning, results) instead of raw event JSON. Live PID/CPU/memory stats and a cancel button are shown while a run is in progress.
- **Git safety** — every run pulls the repo's default branch first, then works on its own dedicated `codeboard/run-<id>` branch so a run can never edit the default branch directly. The run detail page shows a colored (+/-) diff of everything the run changed.
- **Dashboard** — activity chart (last 14 days by status), success rate, global search across repos/tasks/runs, and a sortable/filterable runs list.
- **Settings** — manage API tokens used for the external trigger endpoint.
- **Authentication** — sign in with a Microsoft account (work/school or personal) via Auth.js; every repo, task, run, and API token is owned by and scoped to the signed-in user, so multiple people can safely share one deployment.

## Tech stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · Prisma 7 + SQLite (`better-sqlite3` driver adapter) · `node-cron` scheduler (started from `instrumentation.ts`) · Auth.js (NextAuth v5) with the Microsoft Entra ID provider.

## Getting started

### Prerequisites

- Node.js and npm
- The [GitHub Copilot CLI](https://github.com/github/copilot-cli) (`copilot`) installed and authenticated (interactive `/login`, or a `GH_TOKEN`/`GITHUB_TOKEN` env var with the "Copilot Requests" permission)
- `git` on your `PATH`
- A Microsoft Entra ID (Azure AD) app registration for sign-in — see [Authentication setup](#authentication-setup) below

### Run in dev mode

```bash
npm install
npm run quickstart   # generates the Prisma client, applies migrations, then starts `next dev`
```

Or step by step:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3100](http://localhost:3100).

### Run a Release (production) build

Dev mode rebuilds on every request and isn't meant for long-running/scheduled use. To run the optimized production build instead:

```bash
npx prisma generate        # only needed if you changed prisma/schema.prisma
npx prisma migrate deploy  # only needed if there are new migrations
npm run build
npm run start              # runs `next start -p 3100` — serves the build, no hot-reload
```

The `node-cron` scheduler starts automatically in both dev and production mode, as long as the process keeps running — see [Scheduling notes](#scheduling-notes) below.

## Authentication setup

CodeBoard requires signing in with a Microsoft account before any UI page or API route (other than the auth, GitHub webhook, and external-trigger endpoints) becomes accessible. This needs a Microsoft Entra ID app registration:

1. **Create the app registration** (supports both work/school and personal Microsoft accounts):
   ```bash
   az ad app create --display-name "CodeBoard" \
     --sign-in-audience AzureADandPersonalMicrosoftAccount \
     --web-redirect-uris "http://localhost:3100/api/auth/callback/microsoft-entra-id" \
     --enable-id-token-issuance true
   ```
2. **Create a client secret** for the app you just created (use its `appId` from the previous step's output):
   ```bash
   az ad app credential reset --id <appId> --display-name "codeboard-nextauth" --years 2
   ```
3. **Create a service principal** so consent/sign-in works:
   ```bash
   az ad sp create --id <appId>
   ```
4. **Add the env vars** to `.env` (see the table below) using the `appId` and secret from steps 1–2, plus a freshly generated `AUTH_SECRET`:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
5. For a non-localhost deployment, add its callback URL (`https://<your-domain>/api/auth/callback/microsoft-entra-id`) as an additional `--web-redirect-uris` entry on the app registration, and set `AUTH_URL` to that domain.

No `AUTH_MICROSOFT_ENTRA_ID_ISSUER` is set intentionally — omitting it makes Auth.js default to the `common` endpoint, which is required for personal Microsoft accounts (not just organizational ones) to be able to sign in.

## Scheduling notes

Scheduled tasks are driven entirely by the Node.js server process (`instrumentation.ts` → `node-cron`), not by the browser — a task will still fire on schedule even if no browser tab is open. What _does_ matter is keeping the server process itself alive continuously:

- Don't let the machine sleep/hibernate while relying on schedules (suspends all timers). On macOS, the server automatically prevents system sleep for as long as it's running (via `caffeinate`, started from `instrumentation.ts`); set `CODEBOARD_PREVENT_SLEEP=false` to disable this. Not yet implemented on other platforms — use OS-level settings there.
- Run the server as a persistent background process (e.g. `pm2`, a Windows service via NSSM, or a Task Scheduler/systemd entry set to restart on failure) rather than a terminal you might close.
- There's currently no "catch up on missed runs" — if the process was down when a scheduled time passed, that run is simply skipped.

## Configuration

| Env var                          | Purpose                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                   | SQLite connection string, defaults to `file:./dev.db` (see `.env`)                           |
| `GH_TOKEN` / `GITHUB_TOKEN`      | Optional PAT for headless Copilot CLI auth (needs "Copilot Requests" permission)             |
| `AUTH_MICROSOFT_ENTRA_ID_ID`     | Client (application) ID of the Microsoft Entra ID app registration used for sign-in          |
| `AUTH_MICROSOFT_ENTRA_ID_SECRET` | Client secret for that app registration                                                      |
| `AUTH_SECRET`                    | Random secret Auth.js uses to sign/encrypt session tokens — required in production           |
| `AUTH_URL`                       | Base URL of the deployment (e.g. `http://localhost:3100`), used to build OAuth callback URLs |
| `AUTH_TRUST_HOST`                | Set to `true` when running behind a reverse proxy or on a non-standard host/port             |
| `CODEBOARD_PREVENT_SLEEP`        | Set to `false` to disable the automatic macOS sleep prevention (see "Scheduling notes")      |

Local state — the SQLite database, per-run logs, and any auto-cloned `GIT_URL` repos — lives under `dev.db` and `data/`, both git-ignored since they're machine-specific and may contain repo paths/log content.
