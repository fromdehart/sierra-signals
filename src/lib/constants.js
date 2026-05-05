export const CANONICAL_CATS = [
  "CX/Support Transformation",
  "Volume/Scale Pain",
  "Tech Stack Changes",
  "AI Readiness",
  "Leadership Changes",
  "Funding/IPO",
  "Negative CX Press",
];

export const CAT_COLORS = {
  "CX/Support Transformation": { bg: "#dbeafe", text: "#1e40af", border: "#93c5fd" },
  "Volume/Scale Pain":         { bg: "#fce7f3", text: "#9d174d", border: "#f9a8d4" },
  "Tech Stack Changes":        { bg: "#e0e7ff", text: "#3730a3", border: "#a5b4fc" },
  "AI Readiness":              { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7" },
  "Leadership Changes":        { bg: "#fef3c7", text: "#92400e", border: "#fcd34d" },
  "Funding/IPO":               { bg: "#dcfce7", text: "#14532d", border: "#86efac" },
  "Negative CX Press":         { bg: "#fee2e2", text: "#991b1b", border: "#fca5a5" },
};

export const STATUS_COLORS = {
  "Not started":    { bg: "#f1f5f9", text: "#475569" },
  "Touch 1 sent":   { bg: "#dbeafe", text: "#1e40af" },
  "Touch 2 sent":   { bg: "#e0e7ff", text: "#3730a3" },
  "Touch 3 sent":   { bg: "#fef3c7", text: "#92400e" },
  "Reply received": { bg: "#d1fae5", text: "#065f46" },
  "Meeting booked": { bg: "#dcfce7", text: "#14532d" },
};

export const STATUSES = Object.keys(STATUS_COLORS);

export const PROVIDER_LABELS = {
  agent: "Claude Agent",
  brave: "Brave Search",
  tavily: "Tavily",
};

export const DEFAULT_SIG_CRITERIA = `You are a signal detector for Sierra AI — an AI-powered customer service and support automation platform.

SIGNAL CATEGORIES (use these exact names):
1. CX/Support Transformation
2. Volume/Scale Pain
3. Tech Stack Changes
4. AI Readiness
5. Leadership Changes
6. Funding/IPO
7. Negative CX Press

Return a JSON array. Each item:
{
  "category": "<exact name from list above>",
  "headline": "<8-word title>",
  "summary": "<2-3 sentences why it matters for Sierra>",
  "relevance_score": <1-10>,
  "source_url": "<direct article URL — NOT a homepage>",
  "source_name": "<publication>",
  "date": "<YYYY-MM-DD>"
}`;

export const DEFAULT_MSG_CRITERIA = `You are a senior AE at Sierra AI crafting outreach for enterprise accounts.

SIERRA AI CONTEXT:
- AI platform for sophisticated customer service agents (not chatbots)
- True AI agents that resolve complex issues, handle transactions, escalate intelligently
- Customers: Sonos, SiriusXM, ADT, WeightWatchers
- Co-founded by Bret Taylor (former Salesforce co-CEO, Twitter Chair) + Clay Baird

TONE: Sharp, direct, warm, peer-to-peer. Never pitch. Lead with their signal.
STRUCTURE:
- Touch 1 (Relevance): One crisp insight anchored to a specific signal. End with soft question. 3-4 sentences.
- Touch 2 (Value): Concrete proof point relevant to their specific situation. No ask. 3-4 sentences.
- Touch 3 (Ask): Specific, low-friction ask — "15 minutes" not "a call". 2-3 sentences.

RULES:
- Never start with "I wanted to reach out"
- Never use bullets in emails
- Reference the specific signal that triggered outreach
- Use contact's enrichment quote/insight when available
- If contact was recently appointed, reference their new role in Touch 1`;
