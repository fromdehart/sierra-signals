const BASE = "/api";

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(660000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function del(path) {
  const res = await fetch(BASE + path, { method: "DELETE" });
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
}

export async function getProviders() {
  const res = await fetch(BASE + "/providers");
  if (!res.ok) throw new Error("Could not reach server");
  return res.json();
}

// ---------- Persistence ----------

export async function loadData() {
  const res = await fetch(BASE + "/data");
  if (!res.ok) throw new Error("Could not load data");
  return res.json(); // { accounts, settings }
}

export async function saveAccountToDb(account) {
  return post("/data/account", { account });
}

export async function deleteAccountFromDb(id) {
  return del("/data/account/" + id);
}

export async function saveSettingToDb(key, value) {
  return post("/data/settings", { key, value });
}

export async function searchOne(account, typeId, provider) {
  const data = await post("/scan/search-one", { account, typeId, provider });
  return data; // { typeId, label, text }
}

export async function scanSignalsCombined(account, sigCriteria) {
  const data = await post("/scan/signals-combined", { account, sigCriteria });
  return data.signals ?? [];
}

export async function classifySignals(account, searchResults, sigCriteria, aiProvider) {
  const data = await post("/scan/classify-signals", { account, searchResults, sigCriteria, aiProvider });
  return data.signals ?? [];
}

export async function scanContacts(account, provider, aiProvider) {
  const data = await post("/scan/contacts", { account, provider, aiProvider });
  return data.contacts ?? [];
}

export async function scanEnrich(contact, account, provider, aiProvider) {
  const data = await post("/scan/enrich", { contact, account, provider, aiProvider });
  return data.enrichment ?? null;
}

export async function scanOutreach(contact, account, signals, msgCriteria, provider, aiProvider) {
  const data = await post("/scan/outreach", { contact, account, signals, msgCriteria, provider, aiProvider });
  return data.outreach ?? [];
}

// ---------- Gmail ----------

export async function connectGmail() {
  return post("/gmail/connect", {});
}

export async function getGmailStatus() {
  const res = await fetch(BASE + "/gmail/status");
  return res.json(); // { connected, configured }
}

export async function disconnectGmail() {
  const res = await fetch(BASE + "/gmail/disconnect", { method: "DELETE" });
  return res.json();
}

export async function createGmailDraft({ to, subject, body }) {
  return post("/gmail/draft", { to, subject, body });
}

export async function createGmailDraftsBulk(drafts) {
  return post("/gmail/drafts-bulk", { drafts });
}
