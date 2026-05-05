// localStorage adapter using the same chunked key structure as the original artifact.
// Chunking avoids the practical per-key size limits on large datasets.

const CHUNK_SIZE = 10;

function set(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error("Storage write failed:", key, e);
  }
}

function get(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// ---------- Index ----------

export function saveIndex(ids) {
  set("sierra_signals_v1", JSON.stringify({ ids, v: 2 }));
}

export function loadIndex() {
  const raw = get("sierra_signals_v1");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ---------- Account base ----------

export function saveAccount(acct) {
  const { signals, contacts, ...base } = acct;
  set("acct:" + acct.id, JSON.stringify(base));
}

export function loadAccount(id) {
  const raw = get("acct:" + id);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ---------- Signals (chunked 10 per key) ----------

export function saveSignals(accountId, signals) {
  const chunks = [];
  for (let i = 0; i < signals.length; i += CHUNK_SIZE) {
    chunks.push(signals.slice(i, i + CHUNK_SIZE));
  }
  set("sigs:" + accountId + ":count", JSON.stringify(chunks.length));
  chunks.forEach((chunk, i) => set("sigs:" + accountId + ":" + i, JSON.stringify(chunk)));
}

export function loadSignals(accountId) {
  const countRaw = get("sigs:" + accountId + ":count");
  if (!countRaw) return [];
  const count = JSON.parse(countRaw);
  const out = [];
  for (let i = 0; i < count; i++) {
    const raw = get("sigs:" + accountId + ":" + i);
    if (raw) {
      try { out.push(...JSON.parse(raw)); } catch {}
    }
  }
  return out;
}

// ---------- Contacts (one key per contact) ----------

export function saveContacts(accountId, contacts) {
  set("ctcts:" + accountId + ":ids", JSON.stringify(contacts.map(c => c.id)));
  contacts.forEach(c => set("ctct:" + c.id, JSON.stringify(c)));
}

export function loadContacts(accountId) {
  const raw = get("ctcts:" + accountId + ":ids");
  if (!raw) return [];
  try {
    const ids = JSON.parse(raw);
    return ids.map(id => {
      const cr = get("ctct:" + id);
      try { return cr ? JSON.parse(cr) : null; } catch { return null; }
    }).filter(Boolean);
  } catch { return []; }
}

// ---------- Criteria ----------

export function saveCriteria(sigCriteria, msgCriteria) {
  set("sierra_criteria_v1", JSON.stringify({ signal: sigCriteria, msg: msgCriteria }));
}

export function loadCriteria() {
  const raw = get("sierra_criteria_v1");
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ---------- Provider preference ----------

export function saveProvider(provider) {
  set("sierra_provider", provider);
}

export function loadProvider() {
  return get("sierra_provider") || "agent";
}

// ---------- Full account load (assembles from chunked keys) ----------

export function loadFullAccount(id) {
  const base = loadAccount(id);
  if (!base) return null;
  return {
    ...base,
    signals: loadSignals(id),
    contacts: loadContacts(id),
  };
}

// ---------- Save full account ----------

export function saveFullAccount(acct) {
  saveAccount(acct);
  saveSignals(acct.id, acct.signals || []);
  saveContacts(acct.id, acct.contacts || []);
}

// ---------- Load all accounts ----------

export function loadAllAccounts() {
  const index = loadIndex();
  if (!index) return [];

  // v2 chunked (current)
  if (index.v === 2 && Array.isArray(index.ids)) {
    return index.ids.map(id => loadFullAccount(id)).filter(Boolean);
  }

  // v1 per-account (ids but no v:2)
  if (Array.isArray(index.ids)) {
    return index.ids.map(id => loadFullAccount(id)).filter(Boolean);
  }

  // Legacy monolithic
  if (Array.isArray(index.accounts)) {
    return index.accounts;
  }

  return [];
}

// ---------- Save all accounts ----------

export function saveAllAccounts(accounts) {
  saveIndex(accounts.map(a => a.id));
  accounts.forEach(saveFullAccount);
}

// ---------- Clear all ----------

export function clearAll() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith("sierra_") || k.startsWith("acct:") || k.startsWith("sigs:") || k.startsWith("ctcts:") || k.startsWith("ctct:"))) {
      keys.push(k);
    }
  }
  keys.forEach(k => localStorage.removeItem(k));
}
