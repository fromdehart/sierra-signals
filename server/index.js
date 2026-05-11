import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { runOneSignalSearch, classifySignalResults, runCombinedAgentScan, runContactScan, runEnrichment, runOutreach } from "./scan.js";
import { dbLoadAllAccounts, dbSaveAccount, dbDeleteAccount, dbLoadSettings, dbSaveSetting } from "./db.js";
import { getAuthUrl, exchangeCode, saveTokens, loadTokens, createDraft } from "./gmail.js";
import open from "open";

dotenv.config();

const app = express();
app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json({ limit: "10mb" }));

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
    const contacts = account.contacts || [];
    const enriched = contacts.filter(c => c.enrichment).length;
    const outreach = contacts.filter(c => c.outreach?.length).length;
    console.log("[save]", account["Account Name"] || account.id, "| sigs:", (account.signals || []).length, "| contacts:", contacts.length, "| enriched:", enriched, "| outreach:", outreach);
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
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
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
  const { account, searchResults, sigCriteria, aiProvider } = req.body;
  if (!account || !searchResults) return res.status(400).json({ error: "account and searchResults required" });
  try {
    const signals = await classifySignalResults(account, searchResults, sigCriteria, aiProvider);
    res.json({ signals });
  } catch (e) {
    console.error("[classify-signals]", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/scan/contacts", async (req, res) => {
  const { account, provider, aiProvider } = req.body;
  if (!account) return res.status(400).json({ error: "account required" });
  try {
    const contacts = await runContactScan(account, provider || "agent", aiProvider);
    res.json({ contacts });
  } catch (e) {
    console.error("[contacts]", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/scan/enrich", async (req, res) => {
  const { contact, account, provider, aiProvider } = req.body;
  if (!contact || !account) return res.status(400).json({ error: "contact and account required" });
  try {
    const enrichment = await runEnrichment(contact, account, provider || "agent", aiProvider);
    res.json({ enrichment });
  } catch (e) {
    console.error("[enrich]", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/scan/outreach", async (req, res) => {
  const { contact, account, signals, msgCriteria, provider, aiProvider } = req.body;
  if (!contact || !account) return res.status(400).json({ error: "contact and account required" });
  try {
    const outreach = await runOutreach(contact, account, signals, msgCriteria, aiProvider);
    res.json({ outreach });
  } catch (e) {
    console.error("[outreach]", e);
    res.status(500).json({ error: e.message });
  }
});

// ---------- Gmail OAuth ----------

app.get("/auth/google", (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(400).send("GOOGLE_CLIENT_ID not set in .env");
  res.redirect(getAuthUrl().replace("localhost", "127.0.0.1"));
});

// Opens the OAuth URL in the local browser on the server machine
app.post("/api/gmail/connect", async (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) return res.status(400).json({ error: "GOOGLE_CLIENT_ID not set" });
  try {
    const url = getAuthUrl().replace("localhost", "127.0.0.1");
    await open(url);
    res.json({ ok: true });
  } catch (e) {
    console.error("[gmail] open browser error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.send("<script>window.opener?.postMessage('gmail-auth-error','*');window.close();</script>");
  try {
    const tokens = await exchangeCode(code);
    saveTokens(tokens);
    res.send("<script>window.opener?.postMessage('gmail-auth-ok','*');window.close();</script>");
  } catch (e) {
    console.error("[gmail] auth error:", e);
    res.send("<script>window.opener?.postMessage('gmail-auth-error','*');window.close();</script>");
  }
});

app.get("/api/gmail/status", (_req, res) => {
  const tokens = loadTokens();
  res.json({ connected: !!tokens?.access_token, configured: !!process.env.GOOGLE_CLIENT_ID });
});

app.delete("/api/gmail/disconnect", (_req, res) => {
  dbSaveSetting("gmailTokens", null);
  res.json({ ok: true });
});

app.post("/api/gmail/draft", async (req, res) => {
  const { to, subject, body } = req.body;
  if (!subject || !body) return res.status(400).json({ error: "subject and body required" });
  try {
    await createDraft({ to, subject, body });
    res.json({ ok: true });
  } catch (e) {
    console.error("[gmail] draft error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/gmail/drafts-bulk", async (req, res) => {
  const { drafts } = req.body; // [{ to, subject, body }]
  if (!Array.isArray(drafts)) return res.status(400).json({ error: "drafts array required" });
  const results = [];
  for (const d of drafts) {
    try {
      await createDraft(d);
      results.push({ ok: true });
    } catch (e) {
      results.push({ ok: false, error: e.message });
    }
  }
  res.json({ results, created: results.filter(r => r.ok).length });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log("Sierra Signals server running on http://localhost:" + PORT);
  console.log("Search: agent=yes brave=" + (!!process.env.BRAVE_API_KEY) + " tavily=" + (!!process.env.TAVILY_API_KEY));
  console.log("AI classify: anthropic=" + (!!process.env.ANTHROPIC_API_KEY) + " openai=" + (!!process.env.OPENAI_API_KEY));
});
