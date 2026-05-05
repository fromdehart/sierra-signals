import * as api from "./api.js";
import { doMerge, uid } from "./scoring.js";

const SEARCH_TYPES = [
  { id: "leadership", label: "Leadership" },
  { id: "cx_ai",     label: "CX / AI" },
  { id: "funding",   label: "Funding" },
  { id: "negative",  label: "Negative CX" },
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function tierOrder(acct) {
  const t = acct["Sales Tier"];
  return t === "A" ? 1 : t === "B" ? 2 : 3;
}

// ---------- Signal Scan ----------

export async function runBulkSignalScan({ accounts, sigCriteria, provider, onLog, onAccountDone, shouldStop }) {
  const sorted = [...accounts].sort((a, b) => tierOrder(a) - tierOrder(b));

  for (let i = 0; i < sorted.length; i++) {
    if (shouldStop()) break;
    const acct = sorted[i];
    const name = acct["Account Name"] || acct.id;
    onLog("[" + (i + 1) + "/" + sorted.length + "] " + name);

    try {
      // Run 4 searches in parallel, logging each as it completes
      const pending = new Set(SEARCH_TYPES.map(t => t.label));
      onLog("  Searching: " + [...pending].join(" · "));

      const searchResults = await Promise.all(
        SEARCH_TYPES.map(t =>
          api.searchOne(acct, t.id, provider).then(result => {
            pending.delete(t.label);
            if (pending.size > 0) onLog("  Still searching: " + [...pending].join(" · "));
            return result;
          })
        )
      );

      if (shouldStop()) break;

      const withResults = searchResults.filter(r => r.text?.trim());
      const resultCounts = searchResults.map(r => {
        const lines = (r.text || "").split("\n").filter(l => l.startsWith("Title:")).length;
        return r.label + ": " + lines;
      }).join("  ");
      onLog("  Searches done — " + resultCounts);
      onLog("  Classifying: reading results, scoring relevance, extracting signal dates & sources...");

      // Tick elapsed time every 10s so the log doesn't look frozen
      const classifyStart = Date.now();
      const ticker = setInterval(() => {
        const s = Math.round((Date.now() - classifyStart) / 1000);
        onLog("  Still classifying... (" + s + "s)");
      }, 10000);

      let newSigs = [];
      try {
        newSigs = await api.classifySignals(acct, searchResults, sigCriteria);
      } finally {
        clearInterval(ticker);
      }

      const updated = doMerge(acct, newSigs);
      onAccountDone(updated);
      onLog("  Done — " + newSigs.length + " signal(s) found");
    } catch (e) {
      onLog("  Error: " + e.message);
    }

    if (i < sorted.length - 1 && !shouldStop()) {
      onLog("  Waiting 5s...");
      await sleep(5000);
    }
  }

  onLog("Signal scan complete.");
}

// ---------- Contact ID ----------

export async function runBulkContactScan({ accounts, provider, onLog, onAccountDone, shouldStop }) {
  const sorted = [...accounts].sort((a, b) => tierOrder(a) - tierOrder(b));

  for (let i = 0; i < sorted.length; i++) {
    if (shouldStop()) break;
    const acct = sorted[i];
    onLog("Finding contacts: " + (acct["Account Name"] || acct.id));

    try {
      const newContacts = await api.scanContacts(acct, provider);
      const updated = { ...acct, contacts: newContacts };
      onAccountDone(updated);
      onLog("  Found " + newContacts.length + " contact(s)");
    } catch (e) {
      onLog("  Error: " + e.message);
    }

    if (i < sorted.length - 1 && !shouldStop()) await sleep(5000);
  }

  onLog("Contact ID scan complete.");
}

// ---------- Enrichment ----------

export async function runBulkEnrichment({ accounts, provider, onLog, onAccountDone, shouldStop }) {
  for (const acct of accounts) {
    if (shouldStop()) break;
    const contacts = acct.contacts || [];
    const unenriched = contacts.filter(c => !c.enrichment);

    if (unenriched.length === 0) {
      onLog("No unenriched contacts for " + (acct["Account Name"] || acct.id));
      continue;
    }

    const updatedContacts = [...contacts];

    for (const contact of unenriched) {
      if (shouldStop()) break;
      onLog("Enriching " + contact.name + " at " + (acct["Account Name"] || acct.id));

      try {
        const enrichData = await api.scanEnrich(contact, acct, provider);
        const idx = updatedContacts.findIndex(c => c.id === contact.id);
        if (idx >= 0 && enrichData) {
          updatedContacts[idx] = { ...updatedContacts[idx], ...enrichData };
        }
        onLog("  Enriched " + contact.name);
      } catch (e) {
        onLog("  Error enriching " + contact.name + ": " + e.message);
      }

      if (!shouldStop()) await sleep(1000);
    }

    onAccountDone({ ...acct, contacts: updatedContacts });
  }

  onLog("Enrichment complete.");
}

// ---------- Outreach ----------

export async function runBulkOutreach({ accounts, msgCriteria, provider, onLog, onAccountDone, shouldStop }) {
  for (const acct of accounts) {
    if (shouldStop()) break;
    const contacts = acct.contacts || [];
    const noOutreach = contacts.filter(c => !c.outreach);

    if (noOutreach.length === 0) {
      onLog("No contacts needing outreach for " + (acct["Account Name"] || acct.id));
      continue;
    }

    const updatedContacts = [...contacts];

    for (const contact of noOutreach) {
      if (shouldStop()) break;
      onLog("Generating outreach for " + contact.name + " at " + (acct["Account Name"] || acct.id));

      try {
        const outreach = await api.scanOutreach(contact, acct, acct.signals, msgCriteria, provider);
        const idx = updatedContacts.findIndex(c => c.id === contact.id);
        if (idx >= 0) {
          updatedContacts[idx] = { ...updatedContacts[idx], outreach };
        }
        onLog("  Generated outreach for " + contact.name);
      } catch (e) {
        onLog("  Error: " + e.message);
      }

      if (!shouldStop()) await sleep(1000);
    }

    onAccountDone({ ...acct, contacts: updatedContacts });
  }

  onLog("Outreach generation complete.");
}

// ---------- Single-contact operations ----------

export async function enrichContact(contact, acct, provider) {
  return api.scanEnrich(contact, acct, provider);
}

export async function generateOutreach(contact, acct, signals, msgCriteria, provider) {
  return api.scanOutreach(contact, acct, signals, msgCriteria, provider);
}

// ---------- CSV Import ----------

export function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map(line => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || [];
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] || "").trim().replace(/^"|"$/g, "");
    });
    obj.id = uid();
    obj.signals = [];
    obj.contacts = [];
    return obj;
  });
}
