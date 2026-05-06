import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runOneSignalSearch, classifySignalResults, runCombinedAgentScan, runContactScan, runEnrichment, runOutreach } from "./scan.js";
import { dbLoadAllAccounts, dbSaveAccount, dbDeleteAccount, dbLoadSettings, dbSaveSetting } from "./db.js";

dotenv.config();

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json({ limit: "2mb" }));

// ---------- Data persistence ----------

app.get("/api/data", (_req, res) => {
  try {
    const accounts = dbLoadAllAccounts();
    const settings = dbLoadSettings();
    res.json({ accounts, settings });
  } catch (e) {
    console.error("[data] load error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/data/account", (req, res) => {
  const { account } = req.body;
  if (!account?.id) return res.status(400).json({ error: "account.id required" });
  try {
    dbSaveAccount(account);
    res.json({ ok: true });
  } catch (e) {
    console.error("[data] save account error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.delete("/api/data/account/:id", (req, res) => {
  try {
    dbDeleteAccount(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/data/settings", (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: "key required" });
  try {
    dbSaveSetting(key, value);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- Scan providers ----------

// Which providers are available (based on keys in .env)
app.get("/api/providers", (_req, res) => {
  res.json({
    agent: true,
    brave: !!process.env.BRAVE_API_KEY,
    tavily: !!process.env.TAVILY_API_KEY,
    fastClassify: !!process.env.ANTHROPIC_API_KEY,
  });
});

// Step 1: one of the 4 parallel searches (called 4× simultaneously by frontend)
app.post("/api/scan/search-one", async (req, res) => {
  const { account, typeId, provider } = req.body;
  if (!account || !typeId) return res.status(400).json({ error: "account and typeId required" });
  try {
    const result = await runOneSignalSearch(account, typeId, provider || "agent");
    res.json(result);
  } catch (e) {
    console.error("[search-one]", e);
    res.status(500).json({ error: e.message });
  }
});

// Agent-only fast path: one subprocess does all 4 searches + classify in one pass
app.post("/api/scan/signals-combined", async (req, res) => {
  const { account, sigCriteria } = req.body;
  if (!account) return res.status(400).json({ error: "account required" });
  try {
    const signals = await runCombinedAgentScan(account, sigCriteria || "");
    res.json({ signals });
  } catch (e) {
    console.error("[signals-combined]", e);
    res.status(500).json({ error: e.message });
  }
});

// Step 2: classify the combined search results into signals
app.post("/api/scan/classify-signals", async (req, res) => {
  const { account, searchResults, sigCriteria } = req.body;
  if (!account || !searchResults) return res.status(400).json({ error: "account and searchResults required" });
  try {
    const signals = await classifySignalResults(account, searchResults, sigCriteria);
    res.json({ signals });
  } catch (e) {
    console.error("[classify-signals]", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/scan/contacts", async (req, res) => {
  const { account, provider } = req.body;
  if (!account) return res.status(400).json({ error: "account required" });
  try {
    const contacts = await runContactScan(account, provider || "agent");
    res.json({ contacts });
  } catch (e) {
    console.error("[contacts]", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/scan/enrich", async (req, res) => {
  const { contact, account, provider } = req.body;
  if (!contact || !account) return res.status(400).json({ error: "contact and account required" });
  try {
    const enrichment = await runEnrichment(contact, account, provider || "agent");
    res.json({ enrichment });
  } catch (e) {
    console.error("[enrich]", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/scan/outreach", async (req, res) => {
  const { contact, account, signals, msgCriteria, provider } = req.body;
  if (!contact || !account) return res.status(400).json({ error: "contact and account required" });
  try {
    const outreach = await runOutreach(contact, account, signals, msgCriteria, provider || "agent");
    res.json({ outreach });
  } catch (e) {
    console.error("[outreach]", e);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log("Sierra Signals server running on http://localhost:" + PORT);
  console.log("Providers: agent=yes brave=" + (!!process.env.BRAVE_API_KEY) + " tavily=" + (!!process.env.TAVILY_API_KEY));
});
