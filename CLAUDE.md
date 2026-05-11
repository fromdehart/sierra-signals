# Sierra Signals

A local sales intelligence dashboard for AEs. Monitors target accounts for buying signals, finds key decision-makers, and drafts personalized outreach email sequences. Runs entirely on your machine — no cloud account needed beyond the API keys you choose to add.

---

## Setup

### 1 — Prerequisites

```bash
node --version      # must be 18 or newer
npm --version       # any recent version
claude auth status  # must show logged in — run `claude auth login` if not
```

### 2 — Install dependencies

```bash
npm install
```

### 3 — Configure API keys

```bash
bash setup.sh
```

Prompts for each key one at a time and writes them to `.env`. Press Enter to skip any — the app works without most of them.

| Key | Where to get it | Free tier | What it enables |
|-----|----------------|-----------|-----------------|
| `BRAVE_API_KEY` | https://brave.com/search/api/ | 2,000 queries/month | Brave Search provider |
| `TAVILY_API_KEY` | https://tavily.com | 1,000 credits/month | Tavily Search provider |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/ | Pay-per-use | Fast Claude classification (~5s vs ~90s) |
| `OPENAI_API_KEY` | https://platform.openai.com/ | Pay-per-use | OpenAI gpt-5-mini as alternative AI |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google Cloud Console | Free | Gmail draft creation |

**Minimum viable setup (zero keys):** The built-in Claude Agent provider uses your `claude auth login` session for both search and classification. It's slower (~90s per account step) but completely free.

**Recommended:** Add `ANTHROPIC_API_KEY` (classification drops from ~90s to ~5s) and `BRAVE_API_KEY` or `TAVILY_API_KEY` (more reliable search).

### 4 — Start the app

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3002

Open http://localhost:5173. A green "Server online" indicator appears when the backend is reachable.

---

## Importing accounts

Go to **Settings → Import Accounts** and select a CSV file.

Required columns:
```
Account Name, Account Website, Sales Tier, Account Last Meeting,
Account Last Email, Sierra Industry, Sierra Subindustry, Annual Revenue
```

- `Sales Tier` — `A`, `B`, or `C` (A accounts scan first)
- `Sierra Industry` / `Sierra Subindustry` — improves signal relevance (e.g. "Retail", "E-commerce")
- `Annual Revenue` — number only, no $ or commas
- Extra columns are ignored

---

## Running scans

1. Go to the **Accounts** tab
2. Check one or more accounts
3. Click **Run All + Draft** to run the full pipeline, or use individual step buttons:

| Button | What it does |
|--------|-------------|
| Run All + Draft | Signals → Contacts → Enrichment → Outreach → Gmail drafts |
| Run All | Same pipeline without drafts |
| Account Signals | 4 parallel web searches → AI classifies into signal categories |
| Contact ID | Finds current executives at the company |
| Contact Enrichment | Verifies roles and finds public quotes |
| Outreach | Generates a 3-touch email sequence per contact |
| Draft Emails | Creates Gmail drafts from existing outreach (no re-scan) |

First scan takes 3–10 minutes per account depending on AI provider.

---

## Gmail integration (optional)

Creates Gmail drafts directly from outreach touches.

1. Go to https://console.cloud.google.com
2. Enable the Gmail API: APIs & Services → Library → Gmail API → Enable
3. Create credentials: APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Application type: **Desktop app**
4. Copy the Client ID and Secret into `.env` (or re-run `bash setup.sh`)
5. Restart the server
6. Go to **Settings → Gmail Integration → Connect Gmail**
   - Opens a browser on this machine to authorize
   - Page updates automatically when done

---

## Troubleshooting

**"Server offline" banner:** Run `npm run dev` — both servers must start.

**Scans return no results:**
- Check the server terminal for errors
- Run `claude auth status` — Agent provider requires active login
- Verify API keys in `.env` and restart server

**Scans are slow:** Normal without `ANTHROPIC_API_KEY`. Agent subprocess takes ~60–90s per step; Anthropic API drops that to ~5s.

**Gmail "not connected" error:** Go to Settings → Gmail Integration and connect first.

**Data disappears after refresh:** Don't use private/incognito mode. Check Chrome DevTools → Application → Local Storage for keys starting with `sierra_`.

---

## How the scan pipeline works

Each scan type is orchestrated in `src/lib/scan.js`, which calls the Express backend for AI work.

### Signal scan
1. 4 parallel searches: leadership changes, CX/AI initiatives, funding/M&A, negative CX press
2. URLs deduplicated across buckets — same article only classified once
3. Claude classifies each bucket into the 7 signal categories → JSON array
4. Results merged with existing signals (deduplication by headline)

### Contact ID scan
1. 4 parallel searches: CCO/CXO, VP Support, CTO/CDO/AI roles, recent appointments
2. Combined text → Claude extracts up to 8 real named executives → JSON array

### Enrichment
1. One search per contact: verify current role + find public quote on CX/AI/support
2. Returns `{ verified, verification_note, enrichment: { insight, quote, source } }`

### Outreach generation
1. Pure Claude call — no search
2. Uses top signals + enrichment insight + contact quote
3. Returns 3-touch email sequence

### AI provider logic
`classifyText()` in `server/scan.js` selects the LLM:
- `aiProvider === "openai"` → OpenAI gpt-5-mini (requires `OPENAI_API_KEY`)
- `aiProvider === "anthropic"` → Claude Sonnet via Anthropic API (requires `ANTHROPIC_API_KEY`)
- `aiProvider === "auto"` → Anthropic if key present, else Agent subprocess
- Search provider (agent/brave/tavily) is separate from AI provider

---

## Project structure

```
sierra-signals/
├── server/                    ← Node.js Express backend (port 3002)
│   ├── index.js               ← HTTP routes
│   ├── scan.js                ← All scan logic + classifyText()
│   ├── gmail.js               ← Gmail OAuth + draft creation
│   ├── db.js                  ← SQLite (settings, Gmail tokens)
│   ├── lib.js                 ← normCat, uid, CANONICAL_CATS
│   └── providers/
│       ├── agent.js           ← Claude Code SDK (WebSearch + classify)
│       ├── brave.js           ← Brave Search REST API
│       └── tavily.js          ← Tavily SDK
│
└── src/                       ← React frontend (Vite, port 5173)
    ├── App.jsx                ← Root state, tabs, auto-save
    ├── lib/
    │   ├── constants.js       ← CANONICAL_CATS, CAT_COLORS, AI_PROVIDER_LABELS, default prompts
    │   ├── api.js             ← HTTP calls to Express
    │   ├── scan.js            ← Scan orchestration, deduplication, CSV import
    │   ├── scoring.js         ← calcScore, normCat, doMerge, uid
    │   └── storage.js         ← localStorage adapter (chunked format)
    ├── components/
    │   ├── AccountDetail.jsx  ← Per-account signals + contacts + outreach + scan panel
    │   └── ScanActions.jsx    ← Bulk scan buttons for accounts tab
    └── tabs/
        ├── AccountsTab.jsx    ← Sortable table + ScanActions
        ├── PriorityTab.jsx    ← Top accounts, hottest signals
        ├── SignalsTab.jsx     ← Full signal feed with filters
        ├── ContactsTab.jsx    ← All contacts across accounts
        ├── CriteriaTab.jsx    ← Edit AI prompts for signals and outreach
        └── SettingsTab.jsx    ← Import, AI provider, Gmail, export, clear
```

Data is stored in two places:
- **Browser localStorage** — accounts, signals, contacts, outreach (chunked format to avoid per-key size limits)
- **SQLite** (`data/sierra.db`) — settings and Gmail OAuth tokens

Auto-save fires 2 seconds after any account change.

---

## Common customizations

**Add a new signal category:**
- Add to `CANONICAL_CATS` in both `server/lib.js` and `src/lib/constants.js`
- Add a color entry to `CAT_COLORS` in `src/lib/constants.js`
- Update `DEFAULT_SIG_CRITERIA` in `src/lib/constants.js`

**Change the scoring formula:**
- Edit `calcScore()` in `src/lib/scoring.js`

**Add a search provider (e.g. Perplexity):**
- Create `server/providers/perplexity.js` with a `search(query)` export
- Add to `getProvider()` in `server/scan.js`
- Add `PERPLEXITY_API_KEY` to `.env.example`
- Add to `PROVIDER_LABELS` in `src/lib/constants.js`
- Add to `/api/providers` in `server/index.js`

**Change number of search results per query:**
- Brave: `count=8` in `server/providers/brave.js`
- Tavily: `maxResults: 8` in `server/providers/tavily.js`

**Adjust rate limiting between accounts:**
- Change `sleep(5000)` in `src/lib/scan.js` (currently 5s between accounts, 1s between contacts)

**Pin the Claude model for classification:**
- Pass `model: "claude-sonnet-4-6"` in the options object in `server/providers/agent.js`

**Add CRM integration (Salesforce / HubSpot):**
- Add a new Express route in `server/index.js`
- Add a button/section in `src/tabs/SettingsTab.jsx`
