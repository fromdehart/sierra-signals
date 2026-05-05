import { useState } from "react";
import { STATUS_COLORS, STATUSES } from "../lib/constants.js";

export default function ContactsTab({ accounts, onContactClick, onAccountUpdated }) {
  const [sortCol, setSortCol] = useState("account");
  const [sortDir, setSortDir] = useState(1);

  // Flatten all contacts across accounts
  const rows = accounts.flatMap(acct =>
    (acct.contacts || []).map(c => ({ ...c, acct }))
  );

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => -d);
    else { setSortCol(col); setSortDir(1); }
  }

  const sorted = [...rows].sort((a, b) => {
    let av, bv;
    if (sortCol === "account") { av = a.acct["Account Name"] || ""; bv = b.acct["Account Name"] || ""; }
    else if (sortCol === "name") { av = a.name || ""; bv = b.name || ""; }
    else if (sortCol === "title") { av = a.title || ""; bv = b.title || ""; }
    else if (sortCol === "status") { av = a.status || ""; bv = b.status || ""; }
    else if (sortCol === "verified") { av = a.verified === true ? 0 : a.verified === false ? 1 : 2; bv = b.verified === true ? 0 : b.verified === false ? 1 : 2; }
    else { av = ""; bv = ""; }
    if (typeof av === "number") return (av - bv) * sortDir;
    return av.localeCompare(bv) * sortDir;
  });

  function updateStatus(contact, acct, val) {
    const updated = {
      ...acct,
      contacts: (acct.contacts || []).map(c => c.id === contact.id ? { ...c, status: val } : c),
    };
    onAccountUpdated(updated);
  }

  function exportCSV() {
    const headers = ["Account", "Name", "Title", "Department", "Verified", "Status", "LinkedIn"];
    const lines = [headers.join(",")];
    sorted.forEach(r => {
      lines.push([
        r.acct["Account Name"] || "",
        r.name || "",
        r.title || "",
        r.department || "",
        r.verified === true ? "Yes" : r.verified === false ? "No" : "Unknown",
        r.status || "",
        r.linkedin_search ? "https://www.linkedin.com/search/results/people/?keywords=" + encodeURIComponent(r.linkedin_search) : "",
      ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "sierra-contacts.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function Th({ col, label }) {
    const active = sortCol === col;
    return (
      <th
        onClick={() => toggleSort(col)}
        style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 12, color: active ? "#1d4ed8" : "#6b7280", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}
      >
        {label} {active ? (sortDir === 1 ? "↑" : "↓") : ""}
      </th>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>Contacts ({rows.length})</div>
        {rows.length > 0 && (
          <button onClick={exportCSV} style={{ padding: "5px 14px", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: "pointer" }}>
            Export CSV
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af" }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>No contacts yet</div>
          <div style={{ fontSize: 14 }}>Run "Contact ID" scan from the Accounts tab</div>
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: 10, background: "#ffffff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <Th col="account" label="Account" />
                <Th col="name" label="Name" />
                <Th col="title" label="Title" />
                <Th col="verified" label="Verified" />
                <Th col="status" label="Status" />
                <th style={{ padding: "10px 14px", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Outreach</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r, i) => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS["Not started"];
                return (
                  <tr
                    key={r.id}
                    onClick={() => onContactClick(r, r.acct)}
                    style={{ background: i % 2 === 0 ? "#ffffff" : "#fafafa", cursor: "pointer", borderBottom: "1px solid #f3f4f6" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#eff6ff"}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#ffffff" : "#fafafa"}
                  >
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "#374151" }}>{r.acct["Account Name"]}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#111827" }}>
                      {r.name}
                      {r.appointed_recently && <span style={{ marginLeft: 6, background: "#dbeafe", color: "#1e40af", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>New</span>}
                      {r.from_signal && <span style={{ marginLeft: 4, background: "#fef3c7", color: "#92400e", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>Signal</span>}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 13, color: "#374151" }}>{r.title}</td>
                    <td style={{ padding: "10px 14px", fontSize: 13 }}>
                      {r.verified === true ? <span style={{ color: "#16a34a" }}>✓</span> : r.verified === false ? <span style={{ color: "#dc2626" }}>✗</span> : <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                      <select
                        value={r.status || "Not started"}
                        onChange={e => updateStatus(r, r.acct, e.target.value)}
                        style={{ background: sc.bg, color: sc.text, border: "none", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                      >
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#6b7280" }}>
                      {r.outreach?.length > 0 ? r.outreach.length + " touch" + (r.outreach.length > 1 ? "es" : "") : "—"}
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
