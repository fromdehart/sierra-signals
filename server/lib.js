export const CANONICAL_CATS = [
  "CX/Support Transformation",
  "Volume/Scale Pain",
  "Tech Stack Changes",
  "AI Readiness",
  "Leadership Changes",
  "Funding/IPO",
  "Negative CX Press",
];

export function normCat(raw) {
  if (!raw) return "Other";
  const lo = raw.toLowerCase();
  const hit = CANONICAL_CATS.find(c => c.toLowerCase() === lo);
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

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
