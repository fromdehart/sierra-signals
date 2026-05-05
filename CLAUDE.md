# Sierra Signals — Developer Guide

A local sales prospecting dashboard for Sierra AI AEs. It monitors target accounts for buying signals, identifies key decision-makers, and drafts personalized outreach sequences. Powered by AI search (Claude Agent SDK, Brave, or Tavily) and Claude for classification and writing.

---

## How to run

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Copy the env file and add your API keys
cp .env.example .env
# Edit .env — add BRAVE_API_KEY and/or TAVILY_API_KEY if you want those providers
# The Claude Agent provider needs no API key — it uses your existing `claude` login

# 3. Start everything
npm run dev
# Opens: http://localhost:5173 (frontend)
# Server: http://localhost:3001 (backend API)
```

If Claude Code starts the server for you, just open `http://localhost:5173` in your browser.

---

## How to get API keys

| Provider | Where to get it | Free tier |
|---|---|---|
| Claude Agent | None needed — uses `claude auth login` | — |
| Brave Search | https://brave.com/search/api/ | 2,000 queries/month |
| Tavily | https://tavily.com | 1,000 credits/month |

---

## Project structure

```
sierra-signals/
├── server/                    ← Node.js Express backend
│   ├── index.js               ← HTTP routes, starts on :3001
│   ├── scan.js                ← All scan logic (signals, contacts, enrich, outreach)
│   ├── lib.js                 ← Shared utilities (normCat, uid, sleep, CANONICAL_CATS)
│   └── providers/
│       ├── agent.js           ← Claude Code SDK (WebSearch + classify)
│       ├── brave.js           ← Brave Search REST API (search only)
│       └── tavily.js          ← Tavily SDK (search only)
│
└── src/                       ← React frontend (Vite)
    ├── App.jsx                ← Root: state, tabs, panels, auto-save
    ├── main.jsx               ← React entry point
    ├── lib/
    │   ├── constants.js       ← CANONICAL_CATS, CAT_COLORS, STATUS_COLORS, default prompts
    │   ├── storage.js         ← localStorage adapter (chunked format)
    │   ├── scoring.js         ← calcScore, normCat, doMerge, relDate, uid
    │   ├── api.js             ← HTTP calls to Express (/api/scan/*)
    │   └── scan.js            ← Scan orchestration (bulk loops, CSV import)
    ├── components/
    │   ├── SigCard.jsx        ← Signal card, reused everywhere
    │   ├── CatBar.jsx         ← Category filter bar (derived from live data)
    │   ├── HealthDots.jsx     ← 4 status dots per account
    │   ├── ScanActions.jsx    ← 4 scan buttons + provider selector + log
    │   ├── SignalPanel.jsx    ← Slide-in panel: account signals + contacts + outreach
    │   └── ContactPanel.jsx   ← Slide-in panel: contact detail + outreach generator
    └── tabs/
        ├── PriorityTab.jsx    ← Top accounts, hottest signals, ready-to-contact
        ├── SignalsTab.jsx     ← Full signal feed with filters
        ├── AccountsTab.jsx    ← Sortable table + ScanActions
        ├── ContactsTab.jsx    ← All contacts across accounts
        ├── CriteriaTab.jsx    ← Edit signal and messaging prompts
        └── SettingsTab.jsx    ← Import CSV, export, clear data
```

---

## How the scan pipeline works

Each scan type runs in the frontend (`src/lib/scan.js`), which calls the Express backend for the actual AI work. The backend picks the right search provider.

### Signal scan (per account)
1. 4 parallel searches: leadership, CX/AI, funding, negative press
2. Search results combined into one block of text
3. Claude classifies the text into the 7 signal categories → JSON array
4. Results merged with existing signals (deduplication by headline)

### Contact ID scan
1. 4 parallel searches: CCO/CXO roles, VP Support roles, CTO/CDO/AI roles, recent appointments
2. Combined text → Claude extracts up to 8 real named executives → JSON array
3. Each contact initialized with `id`, `status: "Not started"`, empty outreach

### Enrichment (per contact)
1. One search: verify current role + find public quote on CX/AI/support
2. Claude returns `{ verified, verification_note, enrichment: { insight, quote, source } }`

### Outreach generation (per contact)
1. No search — pure Claude call
2. Uses top signals + enrichment insight + contact quote
3. Returns 3-touch email sequence

### Provider logic
- **Claude Agent**: uses `@anthropic-ai/claude-code` SDK with `allowedTools: ["WebSearch"]` for search, then a second call (no tools) for classification
- **Brave / Tavily**: uses their respective APIs for search, then **always uses Claude Agent** for classification (no extra API key needed for classify)

This means: even when using Brave or Tavily, you still need `claude` to be logged in. The search API just replaces Claude's web browsing, not the reasoning.

---

## Data storage

All data is stored in `localStorage` using a chunked key format (to avoid per-key size limits):

| Key pattern | Contents |
|---|---|
| `sierra_signals_v1` | Index of all account IDs |
| `acct:<id>` | Account base fields (no arrays) |
| `sigs:<id>:count` + `sigs:<id>:0..N` | Signal chunks (10 per key) |
| `ctcts:<id>:ids` + `ctct:<cid>` | Contact IDs + individual contacts |
| `sierra_criteria_v1` | Signal and messaging criteria prompts |
| `sierra_provider` | Currently selected provider |

Auto-save fires 2 seconds after any account change. The Save button in the header also saves criteria.

---

## Common things to ask Claude Code to do

**Add a new signal category:**
- Add the new name to `CANONICAL_CATS` in both `server/lib.js` and `src/lib/constants.js`
- Add a color entry to `CAT_COLORS` in `src/lib/constants.js`
- Update the default signal criteria prompt in `src/lib/constants.js` (`DEFAULT_SIG_CRITERIA`)

**Change the scoring formula:**
- Edit `calcScore()` in `src/lib/scoring.js`

**Add a fourth search provider (e.g. Perplexity):**
- Create `server/providers/perplexity.js` with a `search(query)` export
- Import and add it to `getProvider()` in `server/scan.js`
- Add `PERPLEXITY_API_KEY` to `.env.example`
- Add to `PROVIDER_LABELS` in `src/lib/constants.js`
- Add to the `/api/providers` endpoint in `server/index.js`

**Change the number of search results per query:**
- Brave: `count=8` in `server/providers/brave.js`
- Tavily: `maxResults: 8` in `server/providers/tavily.js`

**Adjust rate limiting between accounts:**
- Change the `sleep(5000)` calls in `src/lib/scan.js` (currently 5 seconds between accounts, 1 second between contacts)

**Change the Claude model used for classification:**
- The agent SDK uses whatever model `claude` is configured with. To pin a model, pass `model: "claude-sonnet-4-6"` in the options object in `server/providers/agent.js`.

**Add Salesforce / HubSpot integration:**
- Add a new Express route in `server/index.js`
- Add a new button/section in `src/tabs/SettingsTab.jsx`

---

## Troubleshooting

**"Server offline" banner in the UI:**
The Express backend isn't running. Run `npm run dev` or `npm run server` separately.

**Scans return no results:**
- Check the terminal running the server for error output
- Verify `claude auth status` is logged in (for Agent provider)
- Verify your API keys in `.env` (for Brave/Tavily)

**"BRAVE_API_KEY not set" error:**
Add the key to your `.env` file, then restart the server.

**Tavily/Brave buttons grayed out in the UI:**
The server didn't find the key in `.env`. Check the server startup output — it logs which providers are active.

**Data not persisting between sessions:**
Check that your browser isn't clearing localStorage on close. In Chrome DevTools → Application → Local Storage, you should see keys starting with `sierra_`.
