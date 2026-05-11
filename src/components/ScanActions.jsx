import { useRef, useState } from "react";
import { PROVIDER_LABELS } from "../lib/constants.js";
import { runBulkSignalScan, runBulkContactScan, runBulkEnrichment, runBulkOutreach, runFullScan } from "../lib/scan.js";

const SCAN_TYPES = [
  { id: "signals",     label: "Account Signals" },
  { id: "contacts",    label: "Contact ID" },
  { id: "enrichment",  label: "Contact Enrichment" },
  { id: "outreach",    label: "Outreach" },
];

export default function ScanActions({
  selectedAccounts,
  allAccounts,
  sigCriteria,
  msgCriteria,
  provider,
  onProviderChange,
  aiProvider,
  availableProviders,
  onAccountUpdated,
}) {
  const [activeType, setActiveType] = useState(null);
  const [log, setLog] = useState([]);
  const stopRef = useRef({ stop: false });
  const logRef = useRef(null);

  const isScanning = !!activeType;

  function addLog(msg) {
    setLog(prev => {
      const next = [...prev, msg];
      return next.slice(-200);
    });
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, 0);
  }

  async function startScan(type) {
    if (isScanning) return;
    if (selectedAccounts.length === 0) return;

    stopRef.current.stop = false;
    setActiveType(type);
    setLog([]);
    const shouldStop = () => stopRef.current.stop;

    const accts = allAccounts.filter(a => selectedAccounts.includes(a.id));

    try {
      if (type === "full+drafts") {
        for (let i = 0; i < accts.length; i++) {
          if (shouldStop()) break;
          await runFullScan({ account: accts[i], sigCriteria, msgCriteria, provider, aiProvider, createDrafts: true, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
          if (i < accts.length - 1 && !shouldStop()) await new Promise(r => setTimeout(r, 3000));
        }
      } else if (type === "signals") {
        await runBulkSignalScan({ accounts: accts, sigCriteria, provider, aiProvider, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
      } else if (type === "contacts") {
        await runBulkContactScan({ accounts: accts, provider, aiProvider, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
      } else if (type === "enrichment") {
        await runBulkEnrichment({ accounts: accts, provider, aiProvider, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
      } else if (type === "outreach") {
        await runBulkOutreach({ accounts: accts, msgCriteria, provider, aiProvider, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
      }
    } catch (e) {
      addLog("Error: " + e.message);
    }

    setActiveType(null);
  }

  function stop() {
    stopRef.current.stop = true;
    addLog("Stopping after current account...");
  }

  const count = selectedAccounts.length;

  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16, marginBottom: 16 }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, color: "#111827", fontSize: 13 }}>
            {count === 0 ? "Select accounts below to scan" : count + " account" + (count > 1 ? "s" : "") + " selected"}
          </span>

          {/* Provider selector */}
          <div style={{ display: "flex", gap: 4 }}>
            {Object.entries(PROVIDER_LABELS).map(([key, label]) => {
              const available = availableProviders[key];
              const active = provider === key;
              return (
                <button
                  key={key}
                  onClick={() => onProviderChange(key)}
                  disabled={!available}
                  title={available ? label : label + " (add API key in .env)"}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 5,
                    border: "1px solid " + (active ? "#3b82f6" : "#d1d5db"),
                    background: active ? "#eff6ff" : available ? "#f9fafb" : "#f3f4f6",
                    color: active ? "#1d4ed8" : available ? "#374151" : "#9ca3af",
                    fontWeight: active ? 700 : 500,
                    fontSize: 12,
                    cursor: available ? "pointer" : "not-allowed",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {isScanning && (
          <button
            onClick={stop}
            style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fee2e2", color: "#991b1b", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Stop
          </button>
        )}
      </div>

      {/* Scan buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Run All + Draft */}
        {(() => {
          const isActive = activeType === "full+drafts";
          const disabled = count === 0 || (isScanning && !isActive);
          return (
            <button
              onClick={() => startScan("full+drafts")}
              disabled={disabled}
              style={{
                padding: "7px 16px", borderRadius: 7, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
                border: "1px solid " + (isActive ? "#3b82f6" : "#16a34a"),
                background: isActive ? "#3b82f6" : disabled ? "#f9fafb" : "#f0fdf4",
                color: isActive ? "#ffffff" : disabled ? "#9ca3af" : "#15803d",
                opacity: disabled && !isActive ? 0.5 : 1,
              }}
            >
              {isActive ? "⟳ Run All + Draft..." : "Run All + Draft"}
            </button>
          );
        })()}

        <div style={{ width: 1, height: 20, background: "#e5e7eb" }} />

        {SCAN_TYPES.map(t => {
          const isActive = activeType === t.id;
          const disabled = count === 0 || (isScanning && !isActive);
          return (
            <button
              key={t.id}
              onClick={() => startScan(t.id)}
              disabled={disabled}
              style={{
                padding: "7px 16px",
                borderRadius: 7,
                border: "1px solid " + (isActive ? "#3b82f6" : "#d1d5db"),
                background: isActive ? "#3b82f6" : disabled ? "#f9fafb" : "#ffffff",
                color: isActive ? "#ffffff" : disabled ? "#9ca3af" : "#374151",
                fontWeight: 600,
                fontSize: 13,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled && !isActive ? 0.5 : 1,
                transition: "background 0.1s",
              }}
            >
              {isActive ? "⟳ " + t.label + "..." : t.label}
            </button>
          );
        })}
      </div>

      {/* Scan log */}
      {log.length > 0 && (
        <div
          ref={logRef}
          style={{
            marginTop: 12,
            background: "#0f172a",
            color: "#94a3b8",
            borderRadius: 6,
            padding: "10px 12px",
            fontFamily: "monospace",
            fontSize: 12,
            maxHeight: 160,
            overflowY: "auto",
            lineHeight: 1.6,
          }}
        >
          {log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
    </div>
  );
}
