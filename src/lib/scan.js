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

async function scanOneAccount(acct, idx, total, sigCriteria, provider, onLog, onAccountDone) {
  const name = acct["Account Name"] || acct.id;
  const tag = "[" + (idx + 1) + "/" + total + "] " + name;
  onLog(tag);

  try {
    {
      // All providers: 4 parallel searches then classify
      const pending = new Set(SEARCH_TYPES.map(t => t.label));
      onLog("  " + name + ": searching " + [...pending].join(" · "));

      const searchResults = await Promise.all(
        SEARCH_TYPES.map(t =>
          api.searchOne(acct, t.id, provider).then(result => {
            pending.delete(t.label);
            onLog("  " + name + ": [" + result.label + "] search done" + (pending.size ? " — waiting on " + [...pending].join(", ") : ""));
            return result;
          })
        )
      );

      // Classify each bucket individually — update UI after each one
      let current = acct;
      let totalSigs = 0;
      for (const r of searchResults) {
        const titles = (r.text || "").split("\n").filter(l => l.startsWith("Title:")).map(l => l.replace("Title: ", "").trim());
        if (titles.length === 0) {
          onLog("    [" + r.label + "] no results, skipping");
          continue;
        }
        onLog("    [" + r.label + "] " + titles.length + " result(s):");
        titles.forEach(t => onLog("      • " + t));
        onLog("    [" + r.label + "] classifying...");

        const ticker = setInterval(() => onLog("    [" + r.label + "] still classifying..."), 10000);
        let bucketSigs = [];
        try {
          bucketSigs = await api.classifySignals(current, [r], sigCriteria);
        } catch (e) {
          onLog("    [" + r.label + "] classify error: " + e.message);
        } finally {
          clearInterval(ticker);
        }

        if (bucketSigs.length === 0) {
          onLog("    [" + r.label + "] → 0 signals");
        } else {
          onLog("    [" + r.label + "] → " + bucketSigs.length + " signal(s): " + bucketSigs.map(s => s.headline).join(" | "));
          current = doMerge(current, bucketSigs);
          totalSigs += bucketSigs.length;
          onAccountDone(current);
        }
      }

      onLog("  " + name + ": done — " + totalSigs + " signal(s)");
    }
  } catch (e) {
    onLog("  " + name + ": error — " + e.message);
  }
}

export async function runBulkSignalScan({ accounts, sigCriteria, provider, onLog, onAccountDone, shouldStop }) {
  const sorted = [...accounts].sort((a, b) => tierOrder(a) - tierOrder(b));
  const BATCH = 2;

  for (let i = 0; i < sorted.length; i += BATCH) {
    if (shouldStop()) break;
    const batch = sorted.slice(i, i + BATCH);
    await Promise.all(
      batch.map((acct, j) => scanOneAccount(acct, i + j, sorted.length, sigCriteria, provider, onLog, onAccountDone))
    );
    if (i + BATCH < sorted.length && !shouldStop()) {
      onLog("Waiting 5s before next batch...");
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
