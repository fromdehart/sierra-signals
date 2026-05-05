import { useState } from "react";
import SigCard from "../components/SigCard.jsx";
import CatBar from "../components/CatBar.jsx";

export default function SignalsTab({ accounts, onAccountClick }) {
  const [cat, setCat] = useState(null);
  const [acctFilter, setAcctFilter] = useState("");
  const [sort, setSort] = useState("score");

  const allSignals = accounts.flatMap(acct =>
    (acct.signals || []).map(s => ({ ...s, acct }))
  );

  const filtered = allSignals
    .filter(s => (!cat || s.category === cat) && (!acctFilter || s.acct.id === acctFilter))
    .sort((a, b) => {
      if (sort === "score") return (b.relevance_score || 0) - (a.relevance_score || 0);
      if (sort === "date") return (b.date || "") > (a.date || "") ? 1 : -1;
      return (a.acct["Account Name"] || "").localeCompare(b.acct["Account Name"] || "");
    });

  return (
    <div>
      {/* Controls */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <CatBar signals={allSignals} activeCategory={cat} onChange={setCat} />

        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          <select
            value={acctFilter}
            onChange={e => setAcctFilter(e.target.value)}
            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, color: "#374151", background: "#ffffff" }}
          >
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a["Account Name"]}</option>)}
          </select>

          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, color: "#374151", background: "#ffffff" }}
          >
            <option value="score">Sort: Score</option>
            <option value="date">Sort: Date</option>
            <option value="account">Sort: Account</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>No signals yet</div>
          <div style={{ fontSize: 14 }}>Select accounts and run "Account Signals" scan from the Accounts tab</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((s, i) => (
            <SigCard
              key={s.id || i}
              sig={s}
              accountName={s.acct["Account Name"]}
              onClick={() => onAccountClick(s.acct, s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
