import { useState } from "react";
import SigCard from "../components/SigCard.jsx";
import CatBar from "../components/CatBar.jsx";
import HealthDots from "../components/HealthDots.jsx";
import { calcScore, scoreColor } from "../lib/scoring.js";
import { CAT_COLORS, STATUS_COLORS } from "../lib/constants.js";

export default function PriorityTab({ accounts, onAccountClick, onContactClick }) {
  const [cat, setCat] = useState(null);
  const [sort, setSort] = useState("score");

  const allSignals = accounts.flatMap(a => (a.signals || []).map(s => ({ ...s, acct: a })));
  const filteredSigs = cat ? allSignals.filter(s => s.category === cat) : allSignals;

  const scored = accounts
    .map(a => ({ ...a, _score: calcScore(a) }))
    .sort((a, b) => b._score - a._score);

  const topAccounts = scored.slice(0, 8);

  const hotSignals = [...filteredSigs]
    .sort((a, b) =>
      sort === "score"
        ? (b.relevance_score || 0) - (a.relevance_score || 0)
        : (b.date || "") > (a.date || "") ? 1 : -1
    )
    .slice(0, 8);

  const readyContacts = accounts
    .flatMap(a => {
      const score = calcScore(a);
      return (a.contacts || [])
        .filter(c => c.outreach?.length > 0 && c.status === "Not started")
        .map(c => ({ ...c, acct: a, acctScore: score }));
    })
    .sort((a, b) => b.acctScore - a.acctScore);

  const hasNewSigs = allSignals.some(s => s.isNew);

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 20 }}>
        <CatBar signals={allSignals} activeCategory={cat} onChange={setCat} />
        <div style={{ marginLeft: "auto" }}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, color: "#374151", background: "#ffffff" }}
          >
            <option value="score">Sort: Score</option>
            <option value="date">Sort: Date</option>
          </select>
        </div>
      </div>

      {/* Section 1: Top accounts */}
      {topAccounts.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 12 }}>Accounts Needing Attention</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {topAccounts.map(acct => {
              const score = acct._score;
              const cats = [...new Set((acct.signals || []).map(s => s.category))].slice(0, 4);
              const topSig = (acct.signals || []).sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))[0];
              return (
                <div
                  key={acct.id}
                  onClick={() => onAccountClick(acct)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderLeft: "4px solid " + scoreColor(score),
                    borderRadius: 8,
                    padding: "14px 14px",
                    cursor: "pointer",
                    transition: "box-shadow 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{acct["Account Name"]}</div>
                    <HealthDots acct={acct} />
                  </div>

                  {/* Priority bar */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 6 }}>
                      <div style={{ width: score + "%", height: "100%", background: scoreColor(score), borderRadius: 4 }} />
                    </div>
                    <span style={{ fontWeight: 700, color: scoreColor(score), fontSize: 12 }}>{score}</span>
                  </div>

                  {/* Category pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                    {cats.map(c => {
                      const col = CAT_COLORS[c] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
                      return (
                        <span key={c} style={{ background: col.bg, color: col.text, border: "1px solid " + col.border, borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{c}</span>
                      );
                    })}
                  </div>

                  {topSig && <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.4 }}>{topSig.headline}</div>}

                  <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 11, color: "#9ca3af" }}>
                    <span>{(acct.signals || []).length} signals</span>
                    <span>{(acct.contacts || []).length} contacts</span>
                    {(acct["Account Last Meeting"] || acct["Account Last Email"]) && (
                      <span>Last touch {new Date(acct["Account Last Meeting"] || acct["Account Last Email"]).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 2: Hottest signals */}
      {hotSignals.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 12 }}>Hottest Signals</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {hotSignals.map((s, i) => (
              <SigCard
                key={s.id || i}
                sig={s}
                accountName={s.acct["Account Name"]}
                onClick={() => onAccountClick(s.acct, s.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Ready to contact */}
      {readyContacts.length > 0 && (
        <section>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 12 }}>Ready to Contact</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {readyContacts.map(c => (
              <div
                key={c.id}
                onClick={() => onContactClick(c, c.acct)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                onMouseLeave={e => e.currentTarget.style.background = "#ffffff"}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>{c.title} · {c.acct["Account Name"]}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "#9ca3af" }}>Score {c.acctScore}</span>
                  <span style={{ background: STATUS_COLORS["Not started"].bg, color: STATUS_COLORS["Not started"].text, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>Not started</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {accounts.length === 0 && (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>No accounts yet</div>
          <div style={{ fontSize: 14 }}>Import a CSV from the Settings tab or the Accounts tab</div>
        </div>
      )}
    </div>
  );
}
