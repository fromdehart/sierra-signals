export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function normCat(raw) {
  const CATS = [
    "CX/Support Transformation", "Volume/Scale Pain", "Tech Stack Changes",
    "AI Readiness", "Leadership Changes", "Funding/IPO", "Negative CX Press",
  ];
  if (!raw) return "Other";
  const lo = raw.toLowerCase();
  const hit = CATS.find(c => c.toLowerCase() === lo);
  if (hit) return hit;
  if (lo.includes("cx") || lo.includes("support transf")) return "CX/Support Transformation";
  if (lo.includes("volume") || lo.includes("scale")) return "Volume/Scale Pain";
  if (lo.includes("tech stack")) return "Tech Stack Changes";
  if (lo.includes("ai readiness") || lo.includes("ai invest")) return "AI Readiness";
  if (lo.includes("leadership") || lo.includes("executive")) return "Leadership Changes";
  if (lo.includes("funding") || lo.includes("ipo")) return "Funding/IPO";
  if (lo.includes("negative") || lo.includes("complaint")) return "Negative CX Press";
  return raw;
}

export function normHead(h) {
  return (h || "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().slice(0, 60);
}

export function calcScore(acct) {
  const sigs = acct.signals || [];
  const top = sigs.reduce((m, s) => Math.max(m, s.relevance_score || 0), 0);
  const hasNew = sigs.some(s => s.isNew);
  const hasTrend = sigs.some(s => (s.seenCount || 0) >= 2);
  const lt = acct["Account Last Meeting"] || acct["Account Last Email"] || "";
  const days = lt ? Math.floor((Date.now() - new Date(lt)) / 86400000) : 999;
  const rec = sigs.some(s => s.date && (Date.now() - new Date(s.date)) / 86400000 < 7)
    ? 10
    : sigs.some(s => s.date && (Date.now() - new Date(s.date)) / 86400000 < 30)
    ? 5
    : 0;
  return Math.min(
    100,
    Math.round(
      (top / 10) * 40 +
      (hasNew ? 15 : 0) +
      (hasTrend ? 8 : 0) +
      3 +
      (days > 90 ? 15 : days > 30 ? 8 : days > 14 ? 3 : 0) +
      rec,
    ),
  );
}

export function scoreColor(s) {
  return s >= 70 ? "#ef4444" : s >= 45 ? "#f59e0b" : "#22c55e";
}

export function relDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  const diff = Math.floor((Date.now() - d) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 7) return diff + "d ago";
  if (diff < 30) return Math.floor(diff / 7) + "w ago";
  return Math.floor(diff / 30) + "mo ago";
}

export function doMerge(acct, newSigs) {
  const map = new Map((acct.signals || []).map(s => [acct.id + "||" + normHead(s.headline), s]));
  const out = [];
  const seen = new Set();
  newSigs.forEach(ns => {
    const k = acct.id + "||" + normHead(ns.headline);
    seen.add(k);
    if (map.has(k)) {
      const old = map.get(k);
      out.push({ ...old, ...ns, seenCount: (old.seenCount || 1) + 1, lastSeenAt: new Date().toISOString(), isNew: false });
    } else {
      out.push({ ...ns, id: uid(), firstSeenAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), seenCount: 1, isNew: true });
    }
  });
  map.forEach((old, k) => { if (!seen.has(k)) out.push({ ...old, isNew: false }); });
  return { ...acct, signals: out, scannedAt: new Date().toISOString() };
}
