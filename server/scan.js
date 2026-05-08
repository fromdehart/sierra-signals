import * as agentProvider from "./providers/agent.js";
import * as braveProvider from "./providers/brave.js";
import * as tavilyProvider from "./providers/tavily.js";
import { normCat, normHead, uid, CANONICAL_CATS } from "./lib.js";

function getProvider(name) {
  if (name === "brave") return braveProvider;
  if (name === "tavily") return tavilyProvider;
  return agentProvider;
}

const OPENAI_MODEL = "gpt-5-mini";

// Classification: aiProvider controls which LLM is used
// "openai" → OpenAI API, "anthropic" → Anthropic API, default → Claude Agent subprocess
async function classifyText(systemPrompt, content, aiProvider) {
  if (aiProvider === "openai" && process.env.OPENAI_API_KEY) {
    console.log("[classifyText] using OpenAI (" + OPENAI_MODEL + ")");
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const msg = await client.chat.completions.create({
      model: OPENAI_MODEL,
      max_completion_tokens: 4096,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
    });
    console.log("[classifyText] OpenAI tokens:", msg.usage?.total_tokens);
    return msg.choices[0]?.message?.content ?? "";
  }
  if (aiProvider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    console.log("[classifyText] using Anthropic (claude-sonnet-4-6)");
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });
    return msg.content[0]?.text ?? "";
  }
  // Default: auto-select best available
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("[classifyText] auto → Anthropic (claude-sonnet-4-6)");
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });
    return msg.content[0]?.text ?? "";
  }
  console.log("[classifyText] auto → Claude Agent subprocess (aiProvider=" + aiProvider + ")");
  return agentProvider.classify(systemPrompt, content);
}

// ---------- Signal Scan — broken into individual steps for frontend progress tracking ----------

const SIGNAL_SEARCH_TYPES = [
  { id: "leadership", label: "LEADERSHIP" },
  { id: "cx_ai",     label: "CX/AI/SUPPORT" },
  { id: "funding",   label: "FUNDING" },
  { id: "negative",  label: "NEGATIVE CX" },
];

export { SIGNAL_SEARCH_TYPES };

// Long instructional prompt for Claude Agent (understands natural language)
function buildAgentQuery(acct, typeId) {
  const co = acct["Account Name"] || "Unknown";
  const ind = acct["Sierra Industry"]
    ? " (" + acct["Sierra Industry"] + (acct["Sierra Subindustry"] ? " / " + acct["Sierra Subindustry"] : "") + ")"
    : "";
  const today = new Date().toISOString().slice(0, 10);

  if (typeId === "leadership") return 'Find news published in the last 90 days (today is ' + today + ') about executive appointments or departures at ' + co + ind + '. Search "' + co + ' appoints", "' + co + ' names new", "' + co + ' hires chief", "' + co + ' leadership". Include exact publication date and exact article URL for every result.';
  if (typeId === "cx_ai")     return 'Find news in the last 90 days (today is ' + today + ') about customer experience, AI, or support transformation at ' + co + ind + '. Search "' + co + ' customer experience", "' + co + ' AI customer service", "' + co + ' contact center", "' + co + ' support automation". Include exact date and URL.';
  if (typeId === "funding")   return 'Find news in the last 90 days (today is ' + today + ') about funding, M&A, IPO, or growth at ' + co + ind + '. Search "' + co + ' funding", "' + co + ' acquisition", "' + co + ' raises", "' + co + ' growth". Include exact date and URL.';
  if (typeId === "negative")  return 'Find news in the last 90 days (today is ' + today + ') about customer service problems at ' + co + ind + '. Search "' + co + ' complaints", "' + co + ' outage", "' + co + ' customer service problems". Include exact date and URL.';
  throw new Error("Unknown signal search type: " + typeId);
}

// Short keyword query for Brave / Tavily (search engine style, max ~200 chars)
function buildKeywordQuery(acct, typeId) {
  const co = '"' + (acct["Account Name"] || "Unknown") + '"';

  if (typeId === "leadership") return co + ' (appoints OR "names new" OR "hires" OR "chief" OR "leadership") site:businesswire.com OR site:prnewswire.com OR site:linkedin.com OR site:reuters.com OR site:wsj.com';
  if (typeId === "cx_ai")     return co + ' ("customer experience" OR "AI" OR "contact center" OR "support" OR "automation")';
  if (typeId === "funding")   return co + ' (funding OR acquisition OR "raises" OR IPO OR merger)';
  if (typeId === "negative")  return co + ' (complaints OR outage OR "customer service" OR problems OR lawsuit)';
  throw new Error("Unknown signal search type: " + typeId);
}

function buildSignalQuery(acct, typeId, providerName) {
  return providerName === "agent" ? buildAgentQuery(acct, typeId) : buildKeywordQuery(acct, typeId);
}

// Single search step — called 4× in parallel by the frontend
export async function runOneSignalSearch(acct, typeId, providerName) {
  const provider = getProvider(providerName);
  const query = buildSignalQuery(acct, typeId, providerName);
  const text = await provider.search(query);
  const label = SIGNAL_SEARCH_TYPES.find(t => t.id === typeId)?.label || typeId.toUpperCase();
  return { typeId, label, text: text || "" };
}

// Classify step — called once after all 4 searches complete
export async function classifySignalResults(acct, searchResults, sigCrit, aiProvider) {
  const today = new Date().toISOString().slice(0, 10);
  const co = acct["Account Name"] || "Unknown";

  // Truncate each bucket to 2000 chars — Tavily returns full article text which
  // can make the combined payload 50K+ chars and blow Claude's processing time.
  const combined = searchResults
    .map(r => r.text ? "=== " + r.label + " ===\n" + r.text.slice(0, 2000) : "")
    .filter(Boolean)
    .join("\n\n");

  if (!combined.trim()) return [];

  const classifySystem =
    sigCrit +
    "\n\nRESPOND WITH VALID JSON ARRAY ONLY. NO MARKDOWN. NO CODE FENCES.\nUse only these exact category names: " +
    CANONICAL_CATS.join(", ") +
    "\nOnly include signals within 180 days of " + today +
    ". source_url = direct article URL. date = YYYY-MM-DD.";

  const classifyContent =
    "Company: " + co +
    "\nIndustry: " + (acct["Sierra Industry"] || "unknown") +
    "\nWebsite: " + (acct["Account Website"] || "") +
    "\nRevenue: " + (acct["Annual Revenue"] || "") +
    "\nToday: " + today +
    "\n\n" + combined +
    "\n\nReturn JSON array only.";

  const raw = await classifyText(classifySystem, classifyContent, aiProvider);

  console.log("[classify] bucket:", searchResults.map(r => r.label).join(","), "| raw length:", raw.length);
  console.log("[classify] raw response:\n" + raw.slice(0, 1000));

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim() || "[]";
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      console.log("[classify] parsed", parsed.length, "item(s)");
      return parsed.map(s => ({ ...s, category: normCat(s.category) }));
    }
    console.log("[classify] parsed value was not an array:", typeof parsed);
    return [];
  } catch (e) {
    console.log("[classify] JSON parse error:", e.message);
    console.log("[classify] failed to parse:\n" + raw.slice(0, 500));
    return [];
  }
}

// ---------- Contact ID ----------

export async function runContactScan(acct, providerName, aiProvider) {
  const provider = getProvider(providerName);
  const co = acct["Account Name"] || "Unknown";
  const today = new Date().toISOString().slice(0, 10);

  const queries = [
    "Find current executives at " + co + " with titles CCO, CXO, VP Customer Experience, or VP Customer Success. Include full name, exact title, and source URL.",
    "Find current executives at " + co + " with titles VP Customer Support, VP Contact Center, or SVP Support. Include full name, exact title, and source URL.",
    "Find current executives at " + co + " with titles CTO, CDO, VP AI, or VP Engineering. Include full name, exact title, and source URL.",
    'Find news in the last 90 days (today is ' + today + ') about executive appointments at ' + co + '. Search "' + co + ' appoints", "' + co + ' joins as", "' + co + ' named". Include full name, title, date, source URL.',
  ];

  const results = await Promise.all(queries.map(q => provider.search(q)));
  const combined = results.filter(Boolean).join("\n\n");
  if (!combined.trim()) return [];

  const system =
    "You are extracting real, named executives from search results for a sales team at Sierra AI.\n" +
    "Return a JSON array of up to 8 executives. Each item:\n" +
    '{ "name": string, "title": string, "department": string, "rationale": string, "linkedin_search": string, "source_url": string, "appointed_recently": boolean, "appointment_date": string|null, "from_signal": boolean }\n' +
    "NEVER hallucinate. Only include people explicitly named in the search results.\n" +
    "RESPOND WITH VALID JSON ARRAY ONLY. NO MARKDOWN.";

  const content =
    "Company: " + co +
    "\nIndustry: " + (acct["Sierra Industry"] || "unknown") +
    "\nToday: " + today +
    "\n\n" + combined +
    "\n\nReturn JSON array only.";

  const raw = await classifyText(system, content, aiProvider);

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim() || "[]");
    if (Array.isArray(parsed)) {
      return parsed.map(c => ({
        ...c,
        id: uid(),
        accountId: acct.id,
        status: "Not started",
        outreach: null,
        notes: "",
        enrichment: null,
        verified: null,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

// ---------- Contact Enrichment ----------

export async function runEnrichment(contact, acct, providerName, aiProvider) {
  const provider = getProvider(providerName);
  const today = new Date().toISOString().slice(0, 10);

  const q =
    "Verify that " + contact.name + " is currently " + contact.title + " at " + (acct["Account Name"] || "") +
    ". Find a recent public quote or statement from them about customer experience, AI, or support. Include source URL.";

  const searchResult = await provider.search(q);
  if (!searchResult.trim()) return null;

  const system =
    "You are verifying an executive contact for a sales team.\n" +
    "Return a JSON object:\n" +
    '{ "verified": true|false|null, "verification_note": string, "enrichment": { "insight": string, "quote": string, "source": string } }\n' +
    "verified=true if you confirmed their current role. verified=false if they have left. verified=null if unclear.\n" +
    "RESPOND WITH VALID JSON ONLY. NO MARKDOWN.";

  const content =
    "Contact: " + contact.name + ", " + contact.title +
    "\nCompany: " + (acct["Account Name"] || "") +
    "\nToday: " + today +
    "\n\nSearch results:\n" + searchResult +
    "\n\nReturn JSON only.";

  const raw = await classifyText(system, content, aiProvider);

  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return null;
  }
}

// ---------- Outreach Generation ----------

export async function runOutreach(contact, acct, signals, msgCrit, aiProvider) {
  // Outreach is pure LLM — no search needed regardless of provider.
  const topSignals = (signals || [])
    .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
    .slice(0, 3)
    .map(s => "- [" + s.category + "] " + s.headline + " (" + (s.date || "") + ")")
    .join("\n");

  const enrichmentCtx = contact.enrichment
    ? "Enrichment insight: " + contact.enrichment.insight +
      (contact.enrichment.quote ? '\nContact quote: "' + contact.enrichment.quote + '"' : "")
    : "";

  const content =
    "Contact: " + contact.name + ", " + contact.title + " at " + (acct["Account Name"] || "") +
    "\nIndustry: " + (acct["Sierra Industry"] || "") +
    "\nTop signals:\n" + (topSignals || "No signals yet") +
    (enrichmentCtx ? "\n\n" + enrichmentCtx : "") +
    (contact.appointed_recently ? "\nNote: recently appointed to this role." : "") +
    '\n\nReturn a JSON array of 3 email touches: [{ "touch": 1, "subject": string, "body": string }, ...]' +
    "\nNO MARKDOWN. JSON ARRAY ONLY.";

  const raw = await classifyText(msgCrit, content, aiProvider);

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim() || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ---------- Combined Agent Scan (search + classify in one subprocess) ----------

export async function runCombinedAgentScan(acct, sigCrit) {
  const co = acct["Account Name"] || "Unknown";
  const ind = acct["Sierra Industry"]
    ? " (" + acct["Sierra Industry"] + (acct["Sierra Subindustry"] ? " / " + acct["Sierra Subindustry"] : "") + ")"
    : "";
  const today = new Date().toISOString().slice(0, 10);

  const prompt =
    "Today is " + today + ". Research " + co + ind + " for B2B sales buying signals.\n\n" +
    "Use WebSearch to run these searches (run all 4):\n" +
    '1. "' + co + ' appoints" OR "' + co + ' names new" OR "' + co + ' leadership" — executive changes\n' +
    '2. "' + co + ' customer experience" OR "' + co + ' AI" OR "' + co + ' contact center" — CX/AI news\n' +
    '3. "' + co + ' funding" OR "' + co + ' acquisition" OR "' + co + ' raises" — funding/M&A\n' +
    '4. "' + co + ' complaints" OR "' + co + ' outage" OR "' + co + ' customer service problems" — negative CX\n\n' +
    "After all searches, respond with ONLY a valid JSON array. No explanation. No markdown. No code fences.\n" +
    "Each item: { \"category\": string, \"headline\": string, \"date\": \"YYYY-MM-DD\", \"source_url\": string, \"relevance_score\": 1-10, \"summary\": string }\n" +
    "Use only these category names: " + CANONICAL_CATS.join(", ") + "\n" +
    "Only include signals from the last 180 days. If none, return [].\n\n" +
    (sigCrit ? sigCrit + "\n\n" : "") +
    "JSON array only:";

  const raw = await agentProvider.search(prompt);

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim() || "[]");
    if (Array.isArray(parsed)) return parsed.map(s => ({ ...s, category: normCat(s.category) }));
    return [];
  } catch {
    return [];
  }
}
