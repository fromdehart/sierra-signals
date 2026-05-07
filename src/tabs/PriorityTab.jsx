import { useState } from "react";
import HealthDots from "../components/HealthDots.jsx";
import { calcScore, scoreColor, relDate } from "../lib/scoring.js";
import { CAT_COLORS, STATUS_COLORS } from "../lib/constants.js";

export default function PriorityTab({ accounts, onSelectAccount }) {
  const [filter, setFilter] = useState("all");

  const scored = accounts
    .map(a => ({ ...a, _score: calcScore(a) }))
    .filter(a => {
      if (filter === "signals") return (a.signals || []).length > 0;
      if (filter === "contacts") return (a.contacts || []).length > 0;
      if (filter === "ready") return (a.contacts || []).some(c => c.outreach?.length > 0 && c.status === "Not started");
      return true;
    })
    .sort((a, b) => b._score - a._score);

  const readyContacts = accounts
    .flatMap(a => {
      const score = calcScore(a);
      return (a.contacts || [])
        .filter(c => c.outreach?.length > 0 && c.status === "Not started")
        .map(c => ({ ...c, acct: a, acctScore: score }));
    })
    .sort((a, b) => b.acctScore - a.acctScore);

  if (accounts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px", color: "#9ca3af" }}>
        <div style={{ fontSize: 16, marginBottom: 8 }}>No accounts yet</div>
        <div style={{ fontSize: 14 }}>Import a CSV from the Settings tab</div>
      </div>
    );
  }

  return (
    <div>
      {/* Ready to contact — hero section */}
      {readyContacts.length > 0 && (
        <section style={{ marginBottom: 32 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111827", marginBottom: 12 }}>
            Ready to Contact ({readyContacts.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {readyContacts.map(c => {
              const sc = STATUS_COLORS["Not started"];
              return (
                <div
                  key={c.id}
                  onClick={() => onSelectAccount(c.acct)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", background: "#ffffff", border: "1px solid #e5e7eb", borderLeft: "4px solid #22c55e", borderRadius: 8, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0fdf4"}
                  onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>{c.title} · {c.acct["Account Name"]}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#9ca3af" }}>Score {c.acctScore}</span>
                    <span style={{ background: sc.bg, color: sc.text, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                      {c.outreach.length} touch{c.outreach.length > 1 ? "es" : ""} ready
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Account cards */}
      <section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Accounts ({scored.length})</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[["all", "All"], ["signals", "Has signals"], ["contacts", "Has contacts"], ["ready", "Ready to contact"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                style={{ padding: "4px 10px", fontSize: 12, borderRadius: 5, border: "1px solid " + (filter === val ? "#3b82f6" : "#d1d5db"), background: filter === val ? "#eff6ff" : "#ffffff", color: filter === val ? "#1d4ed8" : "#374151", fontWeight: filter === val ? 700 : 500, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {scored.map(acct => {
            const score = acct._score;
            const cats = [...new Set((acct.signals || []).map(s => s.category))].slice(0, 4);
            const topSig = (acct.signals || []).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))[0];
            const lastTouch = acct["Account Last Meeting"] || acct["Account Last Email"];
            return (
              <div
                key={acct.id}
                onClick={() => onSelectAccount(acct)}
                style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderLeft: "4px solid " + scoreColor(score), borderRadius: 8, padding: 14, cursor: "pointer", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.08)"}
                onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", flex: 1, marginRight: 8 }}>{acct["Account Name"]}</div>
                  <HealthDots acct={acct} />
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 6 }}>
                    <div style={{ width: score + "%", height: "100%", background: scoreColor(score), borderRadius: 4 }} />
                  </div>
                  <span style={{ fontWeight: 700, color: scoreColor(score), fontSize: 12 }}>{score}</span>
                </div>

                {cats.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                    {cats.map(c => {
                      const col = CAT_COLORS[c] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
                      return <span key={c} style={{ background: col.bg, color: col.text, border: "1px solid " + col.border, borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{c}</span>;
                    })}
                  </div>
                )}

                {topSig && <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.4, marginBottom: 8 }}>{topSig.headline}</div>}

                <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#9ca3af" }}>
                  <span>{(acct.signals || []).length} signals</span>
                  <span>{(acct.contacts || []).length} contacts</span>
                  {lastTouch && <span>Last touch {relDate(lastTouch)}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
