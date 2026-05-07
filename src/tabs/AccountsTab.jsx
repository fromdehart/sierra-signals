import { useRef, useState } from "react";
import AccountDetail from "../components/AccountDetail.jsx";
import ScanActions from "../components/ScanActions.jsx";
import HealthDots from "../components/HealthDots.jsx";
import { CAT_COLORS } from "../lib/constants.js";
import { calcScore, scoreColor } from "../lib/scoring.js";
import { parseCSV } from "../lib/scan.js";

export default function AccountsTab({
  accounts,
  selectedAccount,
  onSelectAccount,
  onBack,
  sigCriteria,
  msgCriteria,
  provider,
  onProviderChange,
  availableProviders,
  onAccountUpdated,
  onImport,
}) {
  const [selected, setSelected] = useState([]);
  const [sortCol, setSortCol] = useState("score");
  const [sortDir, setSortDir] = useState(-1);
  const [industryFilter, setIndustryFilter] = useState("");
  const [hasSignals, setHasSignals] = useState(false);
  const fileRef = useRef(null);

  const industries = [...new Set(accounts.map(a => a["Sierra Industry"]).filter(Boolean))];

  const filtered = accounts.filter(a =>
    (!industryFilter || a["Sierra Industry"] === industryFilter) &&
    (!hasSignals || (a.signals || []).length > 0)
  );

  const sorted = [...filtered].sort((a, b) => {
    let av, bv;
    if (sortCol === "name")     { av = a["Account Name"] || ""; bv = b["Account Name"] || ""; return av.localeCompare(bv) * sortDir; }
    if (sortCol === "industry") { av = a["Sierra Industry"] || ""; bv = b["Sierra Industry"] || ""; return av.localeCompare(bv) * sortDir; }
    if (sortCol === "revenue")  { av = Number(a["Annual Revenue"] || 0); bv = Number(b["Annual Revenue"] || 0); return (av - bv) * sortDir; }
    if (sortCol === "signals")  { av = (a.signals || []).length; bv = (b.signals || []).length; return (av - bv) * sortDir; }
    if (sortCol === "contacts") { av = (a.contacts || []).length; bv = (b.contacts || []).length; return (av - bv) * sortDir; }
    return (calcScore(a) - calcScore(b)) * sortDir;
  });

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => -d);
    else { setSortCol(col); setSortDir(-1); }
  }

  function toggleAll() {
    setSelected(prev => prev.length === sorted.length ? [] : sorted.map(a => a.id));
  }

  function toggleOne(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result);
        if (parsed.length === 0) { alert("No accounts found in CSV."); return; }
        onImport(parsed);
      } catch (err) { alert("CSV parse error: " + err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // Show account detail if one is selected
  if (selectedAccount) {
    const live = accounts.find(a => a.id === selectedAccount.id) || selectedAccount;
    return (
      <AccountDetail
        acct={live}
        onBack={onBack}
        onAccountUpdated={onAccountUpdated}
        sigCriteria={sigCriteria}
        msgCriteria={msgCriteria}
        provider={provider}
        onProviderChange={onProviderChange}
        availableProviders={availableProviders}
      />
    );
  }

  function Th({ col, label }) {
    const active = sortCol === col;
    return (
      <th onClick={() => toggleSort(col)} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 12, color: active ? "#1d4ed8" : "#6b7280", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", position: "sticky", top: 0, background: "#f9fafb", borderBottom: "1px solid #e5e7eb", zIndex: 1 }}>
        {label} {active ? (sortDir > 0 ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <div>
      <ScanActions
        selectedAccounts={selected}
        allAccounts={accounts}
        sigCriteria={sigCriteria}
        msgCriteria={msgCriteria}
        provider={provider}
        onProviderChange={onProviderChange}
        availableProviders={availableProviders}
        onAccountUpdated={onAccountUpdated}
      />

      {/* Filters + import */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        {industries.length > 0 && (
          <select value={industryFilter} onChange={e => setIndustryFilter(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, color: "#374151", background: "#ffffff" }}>
            <option value="">All industries</option>
            {industries.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        )}
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#374151", cursor: "pointer" }}>
          <input type="checkbox" checked={hasSignals} onChange={e => setHasSignals(e.target.checked)} />
          Has signals
        </label>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
          <button onClick={() => fileRef.current?.click()}
            style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid #3b82f6", background: "#eff6ff", color: "#1d4ed8", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            Import CSV
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af", border: "2px dashed #e5e7eb", borderRadius: 10 }}>
          <div style={{ fontSize: 16, marginBottom: 10 }}>No accounts yet</div>
          <button onClick={() => fileRef.current?.click()}
            style={{ padding: "8px 20px", borderRadius: 7, border: "1px solid #3b82f6", background: "#eff6ff", color: "#1d4ed8", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            Import CSV
          </button>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10, background: "#ffffff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ padding: "10px 12px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <input type="checkbox" checked={selected.length > 0 && selected.length === sorted.length} onChange={toggleAll} />
                </th>
                <Th col="name" label="Account" />
                <Th col="industry" label="Industry" />
                <Th col="revenue" label="Revenue" />
                <Th col="score" label="Priority" />
                <Th col="signals" label="Signals" />
                <Th col="contacts" label="Contacts" />
                <th style={{ padding: "10px 12px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((acct, i) => {
                const score = calcScore(acct);
                const cats = [...new Set((acct.signals || []).map(s => s.category))].slice(0, 3);
                return (
                  <tr key={acct.id} onClick={() => onSelectAccount(acct)}
                    style={{ background: selected.includes(acct.id) ? "#eff6ff" : i % 2 === 0 ? "#ffffff" : "#fafafa", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={e => { if (!selected.includes(acct.id)) e.currentTarget.style.background = "#f0f9ff"; }}
                    onMouseLeave={e => { if (!selected.includes(acct.id)) e.currentTarget.style.background = i % 2 === 0 ? "#ffffff" : "#fafafa"; }}
                  >
                    <td style={{ padding: "10px 12px" }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.includes(acct.id)} onChange={() => toggleOne(acct.id)} />
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{acct["Account Name"]}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{acct["Account Website"]}</div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#374151" }}>
                      {acct["Sierra Industry"]}
                      {acct["Sierra Subindustry"] && <div style={{ fontSize: 11, color: "#9ca3af" }}>{acct["Sierra Subindustry"]}</div>}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#374151" }}>
                      {acct["Annual Revenue"] ? "$" + Number(acct["Annual Revenue"]).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", minWidth: 100 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 3, height: 6 }}>
                          <div style={{ width: score + "%", height: "100%", background: scoreColor(score), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontWeight: 700, color: scoreColor(score), fontSize: 12, minWidth: 20 }}>{score}</span>
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {cats.map(c => {
                          const col = CAT_COLORS[c] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
                          return <span key={c} style={{ background: col.bg, color: col.text, border: "1px solid " + col.border, borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 600 }}>{c}</span>;
                        })}
                        {(acct.signals || []).length === 0 && <span style={{ color: "#9ca3af", fontSize: 12 }}>—</span>}
                      </div>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: 13, color: "#374151" }}>
                      {(acct.contacts || []).length || "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <HealthDots acct={acct} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
