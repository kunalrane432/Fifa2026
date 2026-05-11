# FIFA Cousins 2026 — Project Context

## What This Is
A family World Cup team-picker web app. Each family member picks one team to support. As the real tournament progresses, the admin eliminates teams that get knocked out. The last family member whose team is still alive wins. There is also a points-based leaderboard driven by real match results.

## Tech Stack
- **Backend**: Node.js + Express (`server.js`)
- **Database**: MongoDB Atlas (`mongoose`) — cluster at `cluster0.6kgxwqd.mongodb.net`
- **Frontend**: Vanilla JS + CSS in a single file (`public/index.html`)
- **Deployment**: Vercel (serverless — no Socket.io, uses polling instead)
- **Real-time**: Frontend polls `/api/teams` and `/api/picks` every 4 seconds; leaderboard polls every 30 seconds
- **Match data**: football-data.org API (free tier, competition code `WC`)

## Running Locally
```bash
./start.sh        # starts local MongoDB + node server.js
npm run dev       # nodemon (hot reload), requires MongoDB already running
```
Server runs at `http://localhost:3000`. Local MongoDB binary path is hardcoded in `start.sh`.

## Environment Variables (`.env` — never committed)
| Key | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `ADMIN_PASSWORD` | `goat2026` |
| `SESSION_SECRET` | `fifaworldcup2026cousins` |
| `FOOTBALL_API_KEY` | Free key from football-data.org |

On Vercel these are set under Settings → Environment Variables.

## Database Models
| Model | Purpose |
|---|---|
| `Pick` | One doc per family member — `cousinName`, `teamCode`, `teamName`, `teamFlag`, `pickedAt` |
| `Elimination` | One doc per knocked-out team — `teamCode`, `eliminatedAt` |
| `Match` | One doc per finished WC match — scores, team codes, stage, status |

`Pick.teamCode` had a unique index which was dropped on startup to allow multiple members to pick the same team.

## Key Business Rules
- **One pick per family member** — enforced by case-insensitive bidirectional substring name check (e.g. "kunal" blocks "kunalr" and vice versa)
- **Same team allowed** — multiple family members can pick the same team
- **Winner** = last member whose team has not been eliminated. Winner overlay fires only when admin eliminates a team AND exactly 1 member remains alive (never on page load)
- **Points system** (per match played by chosen team):
  - Win: **10 pts**
  - Win by 3+ goals: **15 pts** (10 + 5 bonus)
  - Draw: **5 pts**
  - Loss: **0 pts**
- **Leaderboard ranking**: standard competition style (1224) — tied members share the same rank, next rank skips (e.g. two at rank 1 → next is rank 3)
- **Eliminated members** sort to the bottom within the same rank tier

## API Routes
| Method | Route | Description |
|---|---|---|
| GET | `/api/teams` | All 48 teams with `pickers[]`, `isEliminated`, `isPicked` |
| GET | `/api/picks` | All picks sorted by most recent first |
| GET | `/api/leaderboard` | Members ranked by points with `rank` field |
| POST | `/api/pick` | Submit a pick (`cousinName`, `teamCode`) |
| POST | `/api/admin/update` | Change a member's team (password required) |
| POST | `/api/admin/delete` | Remove a member's pick (password required) |
| POST | `/api/admin/eliminate` | Mark a team as knocked out (password required) |
| POST | `/api/admin/restore` | Undo an elimination (password required) |
| POST | `/api/admin/sync-matches` | Pull latest finished WC matches from football-data.org (password required) |

## Admin Panel
Accessible via the ⚙️ button (bottom right of the page). Password: `goat2026`.

Sections:
1. **Update / Remove pick** — change or delete a member's team selection
2. **Sync Match Data** — fetches latest finished matches from football-data.org API and updates the leaderboard
3. **Eliminate / Restore** — mark teams as knocked out; triggers winner detection

## Frontend Structure (`public/index.html`)
Single monolithic file. Key sections (top to bottom):
1. Header + subtitle
2. Stats bar (Teams Claimed, Remaining, Still In count)
3. Progress bar
4. Pick form (name + team dropdown)
5. Live picks feed
6. Scoreboard (all picks, ✅/❌ status, sorted by points then alive-first)
7. **Leaderboard** (ranked by points, shared ranks for ties, 🥇🥈🥉 medals)
8. Filter bar + Team grid (all 48 teams, always clickable, shows pickers)
9. Winner overlay (fires on `team_eliminated` poll cycle when 1 member left alive)
10. Admin panel (fixed bottom-right)

## Deployment
- **Repo**: https://github.com/kunalrane432/Fifa2026.git
- **Platform**: Vercel (free tier)
- **Why not Railway**: not free. Vercel works because Socket.io was replaced with polling.
- `vercel.json` routes all requests to `server.js` via `@vercel/node`
- `module.exports = app` at end of `server.js` is required for Vercel

## Testing
```bash
node test-leaderboard.js
```
Runs 16 tests: 10 unit tests for `calcPoints` logic + 6 integration tests against Atlas DB (inserts and cleans up `__TEST__` prefixed data automatically).

## Important Decisions & History
- Socket.io was removed in favour of polling to support Vercel serverless deployment
- The "last pick wins" mechanic was changed to "last team standing wins" (admin eliminates teams as the real WC progresses)
- "Cousins" was renamed to "family members" throughout the UI
- `teamCode` unique index was dropped from MongoDB to allow multiple picks of the same team
- Name deduplication uses bidirectional substring match (not just exact/case-insensitive) to prevent variations like "kunal" / "kunalr" from both registering
