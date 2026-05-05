const BASE = "/api";

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(660000), // 11 minutes — enough for any provider
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export async function getProviders() {
  const res = await fetch(BASE + "/providers");
  if (!res.ok) throw new Error("Could not reach server");
  return res.json();
}

export async function searchOne(account, typeId, provider) {
  const data = await post("/scan/search-one", { account, typeId, provider });
  return data; // { typeId, label, text }
}

export async function classifySignals(account, searchResults, sigCriteria) {
  const data = await post("/scan/classify-signals", { account, searchResults, sigCriteria });
  return data.signals ?? [];
}

export async function scanContacts(account, provider) {
  const data = await post("/scan/contacts", { account, provider });
  return data.contacts ?? [];
}

export async function scanEnrich(contact, account, provider) {
  const data = await post("/scan/enrich", { contact, account, provider });
  return data.enrichment ?? null;
}

export async function scanOutreach(contact, account, signals, msgCriteria, provider) {
  const data = await post("/scan/outreach", { contact, account, signals, msgCriteria, provider });
  return data.outreach ?? [];
}
