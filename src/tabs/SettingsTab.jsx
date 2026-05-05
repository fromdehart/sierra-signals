import { useRef } from "react";
import { clearAll } from "../lib/storage.js";
import { parseCSV } from "../lib/scan.js";

export default function SettingsTab({ accounts, onImport, onClear }) {
  const fileRef = useRef(null);

  const totalSignals = accounts.reduce((n, a) => n + (a.signals || []).length, 0);
  const totalContacts = accounts.reduce((n, a) => n + (a.contacts || []).length, 0);
  const withOutreach = accounts.reduce((n, a) => n + (a.contacts || []).filter(c => c.outreach?.length).length, 0);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = parseCSV(ev.target.result);
        if (parsed.length === 0) { alert("No accounts found in CSV."); return; }
        onImport(parsed);
      } catch (err) {
        alert("CSV parse error: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function exportSignals() {
    const headers = ["Account", "Category", "Headline", "Summary", "Relevance", "Date", "Source"];
    const lines = [headers.join(",")];
    accounts.forEach(acct => {
      (acct.signals || []).forEach(s => {
        lines.push([
          acct["Account Name"] || "",
          s.category || "",
          s.headline || "",
          s.summary || "",
          s.relevance_score || "",
          s.date || "",
          s.source_url || "",
        ].map(v => '"' + String(v).replace(/"/g, '""') + '"').join(","));
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sierra-signals-export.csv";
    a.click();
  }

  function handleClear() {
    if (!window.confirm("Clear all data? This cannot be undone.")) return;
    clearAll();
    onClear();
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 0" }}>
      <h2 style={{ fontWeight: 700, fontSize: 18, color: "#111827", marginBottom: 20 }}>Settings</h2>

      {/* Import */}
      <Card title="Import Accounts">
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
          Import accounts from a CSV file with the following columns:
        </p>
        <code style={{ display: "block", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#374151", marginBottom: 14, lineHeight: 1.8 }}>
          Account Name, Account Website, Sales Tier, Account Last Meeting,<br />
          Account Last Email, Sierra Industry, Sierra Subindustry, Annual Revenue
        </code>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
        <button
          onClick={() => fileRef.current?.click()}
          style={{ padding: "7px 18px", borderRadius: 7, border: "1px solid #3b82f6", background: "#eff6ff", color: "#1d4ed8", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Choose CSV File
        </button>
      </Card>

      {/* Data summary */}
      <Card title="Data Summary" style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: "Accounts", value: accounts.length },
            { label: "Signals", value: totalSignals },
            { label: "Contacts", value: totalContacts },
            { label: "With Outreach", value: withOutreach },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center", padding: "14px 0", background: "#f9fafb", borderRadius: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>{item.value}</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Export */}
      {totalSignals > 0 && (
        <Card title="Export" style={{ marginTop: 16 }}>
          <button
            onClick={exportSignals}
            style={{ padding: "7px 18px", borderRadius: 7, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Export Signals CSV
          </button>
        </Card>
      )}

      {/* Danger zone */}
      <Card title="Danger Zone" style={{ marginTop: 16, border: "1px solid #fca5a5" }}>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 12 }}>
          Permanently clear all accounts, signals, contacts, and outreach from local storage.
        </p>
        <button
          onClick={handleClear}
          style={{ padding: "7px 18px", borderRadius: 7, border: "1px solid #fca5a5", background: "#fee2e2", color: "#991b1b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
        >
          Clear All Data
        </button>
      </Card>
    </div>
  );
}

function Card({ title, children, style }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", ...style }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: 14, color: "#111827" }}>{title}</div>
      <div style={{ padding: "16px 18px" }}>{children}</div>
    </div>
  );
}
