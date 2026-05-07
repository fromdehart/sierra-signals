import { useRef, useState } from "react";
import SigCard from "./SigCard.jsx";
import HealthDots from "./HealthDots.jsx";
import { calcScore, scoreColor, relDate } from "../lib/scoring.js";
import { CAT_COLORS, STATUS_COLORS, STATUSES, PROVIDER_LABELS } from "../lib/constants.js";
import { runFullScan, runBulkSignalScan, runBulkContactScan, runBulkEnrichment, runBulkOutreach, enrichContact, generateOutreach } from "../lib/scan.js";

export default function AccountDetail({ acct, onBack, onAccountUpdated, sigCriteria, msgCriteria, provider, onProviderChange, availableProviders }) {
  const [activeStep, setActiveStep] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [log, setLog] = useState([]);
  const [expandedContacts, setExpandedContacts] = useState({});
  const stopRef = useRef({ stop: false });
  const logRef = useRef(null);

  const score = calcScore(acct);
  const signals = [...(acct.signals || [])].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const contacts = acct.contacts || [];
  const isScanning = !!activeStep;

  function addLog(msg) {
    setLog(prev => [...prev, msg].slice(-300));
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 0);
  }

  function shouldStop() { return stopRef.current.stop; }

  async function runStep(stepId) {
    if (activeStep) return;
    stopRef.current.stop = false;
    setActiveStep(stepId);
    setLog([]);
    setScanOpen(true);
    try {
      if (stepId === "full") {
        await runFullScan({ account: acct, sigCriteria, msgCriteria, provider, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
      } else if (stepId === "signals") {
        await runBulkSignalScan({ accounts: [acct], sigCriteria, provider, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
      } else if (stepId === "contacts") {
        await runBulkContactScan({ accounts: [acct], provider, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
      } else if (stepId === "enrichment") {
        await runBulkEnrichment({ accounts: [acct], provider, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
      } else if (stepId === "outreach") {
        await runBulkOutreach({ accounts: [acct], msgCriteria, provider, onLog: addLog, onAccountDone: onAccountUpdated, shouldStop });
      }
    } catch (e) {
      addLog("Error: " + e.message);
    }
    setActiveStep(null);
  }

  function toggleContact(id) {
    setExpandedContacts(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function updateContact(updated) {
    onAccountUpdated({ ...acct, contacts: contacts.map(c => c.id === updated.id ? updated : c) });
  }

  return (
    <div>
      {/* Breadcrumb + header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 8, fontWeight: 500 }}>
          ← Accounts
        </button>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 22, color: "#111827" }}>{acct["Account Name"]}</div>
            <div style={{ color: "#6b7280", fontSize: 14, marginTop: 2 }}>
              {acct["Sierra Industry"]}{acct["Sierra Subindustry"] ? " / " + acct["Sierra Subindustry"] : ""}
              {acct["Annual Revenue"] ? " · $" + Number(acct["Annual Revenue"]).toLocaleString() : ""}
              {acct["Account Website"] ? " · " + acct["Account Website"] : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <HealthDots acct={acct} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 80, background: "#f3f4f6", borderRadius: 4, height: 6 }}>
                <div style={{ width: score + "%", height: "100%", background: scoreColor(score), borderRadius: 4 }} />
              </div>
              <span style={{ fontWeight: 700, color: scoreColor(score), fontSize: 13 }}>{score}</span>
            </div>
            {/* Scan toggle — secondary action */}
            <button
              onClick={() => setScanOpen(o => !o)}
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6, border: "1px solid #d1d5db", background: scanOpen ? "#f3f4f6" : "#ffffff", color: "#374151", cursor: "pointer", fontWeight: 500 }}
            >
              {isScanning ? "⟳ Scanning..." : "Scan"}
            </button>
          </div>
        </div>
      </div>

      {/* Compact scan panel — only shown when open */}
      {scanOpen && (
        <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: "12px 14px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {/* Provider pills */}
            <div style={{ display: "flex", gap: 3, marginRight: 4 }}>
              {Object.entries(PROVIDER_LABELS).map(([key, label]) => {
                const available = availableProviders[key];
                const active = provider === key;
                return (
                  <button key={key} onClick={() => onProviderChange(key)} disabled={!available}
                    title={available ? label : label + " (add API key in .env)"}
                    style={{ padding: "2px 8px", borderRadius: 4, border: "1px solid " + (active ? "#3b82f6" : "#d1d5db"), background: active ? "#eff6ff" : available ? "#ffffff" : "#f3f4f6", color: active ? "#1d4ed8" : available ? "#374151" : "#9ca3af", fontWeight: active ? 700 : 400, fontSize: 11, cursor: available ? "pointer" : "not-allowed" }}>
                    {label}
                  </button>
                );
              })}
            </div>

            <div style={{ width: 1, height: 16, background: "#e5e7eb" }} />

            {/* Step buttons */}
            {[
              { id: "full", label: "Run All" },
              { id: "signals", label: "Signals" },
              { id: "contacts", label: "Contacts" },
              { id: "enrichment", label: "Enrichment" },
              { id: "outreach", label: "Outreach" },
            ].map(s => (
              <button key={s.id} onClick={() => runStep(s.id)} disabled={isScanning}
                style={{ padding: "4px 10px", fontSize: 12, borderRadius: 5, border: "1px solid " + (activeStep === s.id ? "#3b82f6" : "#d1d5db"), background: activeStep === s.id ? "#3b82f6" : isScanning ? "#f9fafb" : "#ffffff", color: activeStep === s.id ? "#fff" : isScanning ? "#9ca3af" : s.id === "full" ? "#111827" : "#374151", fontWeight: s.id === "full" ? 700 : 500, cursor: isScanning ? "not-allowed" : "pointer" }}>
                {activeStep === s.id ? "⟳ " + s.label : s.label}
              </button>
            ))}

            {isScanning && (
              <button onClick={() => { stopRef.current.stop = true; }}
                style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12, borderRadius: 5, border: "1px solid #fca5a5", background: "#fee2e2", color: "#991b1b", fontWeight: 600, cursor: "pointer" }}>
                Stop
              </button>
            )}
          </div>

          {log.length > 0 && (
            <div ref={logRef} style={{ marginTop: 10, background: "#0f172a", color: "#94a3b8", borderRadius: 6, padding: "8px 12px", fontFamily: "monospace", fontSize: 11, maxHeight: 160, overflowY: "auto", lineHeight: 1.6 }}>
              {log.map((line, i) => <div key={i}>{line}</div>)}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: signals.length > 0 ? "1fr 1fr" : "1fr", gap: 24, alignItems: "start" }}>
        {/* Signals */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 12 }}>
            Signals ({signals.length})
          </div>
          {signals.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 14, padding: "20px 0" }}>No signals yet — run a scan above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {signals.map(sig => <SigCard key={sig.id || sig.headline} sig={sig} />)}
            </div>
          )}
        </div>

        {/* Contacts */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 12 }}>
            Contacts ({contacts.length})
          </div>
          {contacts.length === 0 ? (
            <div style={{ color: "#9ca3af", fontSize: 14, padding: "20px 0" }}>No contacts yet — run a scan above.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contacts.map(c => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  acct={acct}
                  provider={provider}
                  msgCriteria={msgCriteria}
                  expanded={!!expandedContacts[c.id]}
                  onToggle={() => toggleContact(c.id)}
                  onUpdate={updateContact}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactCard({ contact, acct, provider, msgCriteria, expanded, onToggle, onUpdate }) {
  const [enriching, setEnriching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTouch, setActiveTouch] = useState(0);
  const sc = STATUS_COLORS[contact.status] || STATUS_COLORS["Not started"];

  function copyText(text) { navigator.clipboard.writeText(text).catch(() => {}); }
  function gmailLink(subject, body) {
    return "https://mail.google.com/mail/?view=cm&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  async function doEnrich() {
    setEnriching(true);
    try {
      const data = await enrichContact(contact, acct, provider);
      if (data) onUpdate({ ...contact, ...data });
    } catch (e) { console.error(e); }
    setEnriching(false);
  }

  async function doGenerate() {
    setGenerating(true);
    try {
      const outreach = await generateOutreach(contact, acct, acct.signals, msgCriteria, provider);
      onUpdate({ ...contact, outreach });
    } catch (e) { console.error(e); }
    setGenerating(false);
  }

  const touch = contact.outreach?.[activeTouch];

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#ffffff", overflow: "hidden" }}>
      {/* Contact header — always visible */}
      <div
        onClick={onToggle}
        style={{ padding: "10px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, background: expanded ? "#f8fafc" : "#ffffff" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#111827" }}>{contact.name}</span>
            {contact.appointed_recently && <span style={{ background: "#dbeafe", color: "#1e40af", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>New</span>}
            {contact.from_signal && <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 3, padding: "1px 5px", fontSize: 10, fontWeight: 700 }}>Signal</span>}
            {contact.verified === true && <span style={{ color: "#16a34a", fontSize: 12 }}>✓</span>}
            {contact.verified === false && <span style={{ color: "#dc2626", fontSize: 12 }}>✗</span>}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{contact.title}</div>
        </div>
        <div style={{ display: "flex", align: "center", gap: 8 }}>
          <select
            value={contact.status || "Not started"}
            onChange={e => { e.stopPropagation(); onUpdate({ ...contact, status: e.target.value }); }}
            onClick={e => e.stopPropagation()}
            style={{ background: sc.bg, color: sc.text, border: "none", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {contact.outreach?.length > 0 && (
            <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>✓ Outreach</span>
          )}
          <span style={{ color: "#9ca3af", fontSize: 14 }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "12px 14px", borderTop: "1px solid #f3f4f6" }}>
          {/* Enrichment */}
          {contact.enrichment && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, marginBottom: 6 }}>{contact.enrichment.insight}</div>
              {contact.enrichment.quote && (
                <blockquote style={{ borderLeft: "3px solid #3b82f6", paddingLeft: 10, margin: "0 0 6px", color: "#1e40af", fontSize: 12, fontStyle: "italic", lineHeight: 1.5 }}>
                  "{contact.enrichment.quote}"
                  {contact.enrichment.source && <div style={{ marginTop: 2 }}><a href={contact.enrichment.source} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", fontSize: 11, fontStyle: "normal" }}>Source →</a></div>}
                </blockquote>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {contact.linkedin_search && (
              <a href={"https://www.linkedin.com/search/results/people/?keywords=" + encodeURIComponent(contact.linkedin_search)} target="_blank" rel="noopener noreferrer"
                style={{ padding: "4px 10px", fontSize: 12, borderRadius: 5, border: "1px solid #d1d5db", background: "#f9fafb", color: "#374151", textDecoration: "none" }}>
                LinkedIn →
              </a>
            )}
            <button onClick={doEnrich} disabled={enriching}
              style={{ padding: "4px 10px", fontSize: 12, borderRadius: 5, border: "1px solid #d1d5db", background: "#ffffff", color: enriching ? "#9ca3af" : "#374151", cursor: enriching ? "not-allowed" : "pointer" }}>
              {enriching ? "Enriching..." : contact.enrichment ? "Re-enrich" : "Enrich"}
            </button>
            <button onClick={doGenerate} disabled={generating}
              style={{ padding: "4px 10px", fontSize: 12, borderRadius: 5, border: "1px solid #3b82f6", background: generating ? "#f9fafb" : "#eff6ff", color: generating ? "#9ca3af" : "#1d4ed8", cursor: generating ? "not-allowed" : "pointer", fontWeight: 600 }}>
              {generating ? "Generating..." : contact.outreach?.length ? "Regenerate" : "Generate outreach"}
            </button>
          </div>

          {/* Outreach touches */}
          {contact.outreach?.length > 0 && (
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {contact.outreach.map((t, i) => (
                  <button key={i} onClick={() => setActiveTouch(i)}
                    style={{ padding: "3px 10px", fontSize: 12, borderRadius: 5, border: "1px solid " + (activeTouch === i ? "#3b82f6" : "#d1d5db"), background: activeTouch === i ? "#eff6ff" : "#f9fafb", color: activeTouch === i ? "#1d4ed8" : "#374151", fontWeight: activeTouch === i ? 700 : 500, cursor: "pointer" }}>
                    Touch {t.touch}
                  </button>
                ))}
              </div>
              {touch && (
                <div style={{ background: "#f8fafc", borderRadius: 7, padding: "10px 12px" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 6 }}>{touch.subject}</div>
                  <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 8 }}>{touch.body}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => copyText(touch.subject + "\n\n" + touch.body)}
                      style={{ padding: "3px 10px", fontSize: 12, borderRadius: 5, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: "pointer" }}>
                      Copy
                    </button>
                    <a href={gmailLink(touch.subject, touch.body)} target="_blank" rel="noopener noreferrer"
                      style={{ padding: "3px 10px", fontSize: 12, borderRadius: 5, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", textDecoration: "none" }}>
                      Gmail
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div style={{ marginTop: 10 }}>
            <textarea
              value={contact.notes || ""}
              onChange={e => onUpdate({ ...contact, notes: e.target.value })}
              placeholder="Notes..."
              style={{ width: "100%", minHeight: 48, padding: "6px 8px", border: "1px solid #e5e7eb", borderRadius: 5, fontSize: 12, color: "#374151", resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
