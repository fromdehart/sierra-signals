import { useEffect, useRef, useState } from "react";
import SigCard from "./SigCard.jsx";
import HealthDots from "./HealthDots.jsx";
import { calcScore, scoreColor } from "../lib/scoring.js";
import { STATUS_COLORS, STATUSES } from "../lib/constants.js";

export default function SignalPanel({ acct, onClose, onContactClick, onAccountUpdated, highlightSigId }) {
  const [notes, setNotes] = useState(acct?.notes || "");
  const overlayRef = useRef(null);

  useEffect(() => {
    setNotes(acct?.notes || "");
  }, [acct?.id]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!acct) return null;

  const score = calcScore(acct);
  const signals = [...(acct.signals || [])].sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
  const contacts = acct.contacts || [];

  function saveNotes(val) {
    setNotes(val);
    onAccountUpdated({ ...acct, notes: val });
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function gmailLink(subject, body) {
    return "https://mail.google.com/mail/?view=cm&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 40 }}
      />

      {/* Panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 520, maxWidth: "100vw",
        background: "#ffffff", zIndex: 50, overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
        display: "flex", flexDirection: "column",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, background: "#ffffff", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>{acct["Account Name"]}</div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>
                {acct["Sierra Industry"]}{acct["Sierra Subindustry"] ? " / " + acct["Sierra Subindustry"] : ""}
                {acct["Annual Revenue"] ? " · $" + Number(acct["Annual Revenue"]).toLocaleString() : ""}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#9ca3af", cursor: "pointer", lineHeight: 1 }}>×</button>
          </div>

          {/* Priority bar */}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 4, height: 8, overflow: "hidden" }}>
              <div style={{ width: score + "%", height: "100%", background: scoreColor(score), borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontWeight: 700, color: scoreColor(score), minWidth: 28, fontSize: 13 }}>{score}</span>
            <HealthDots acct={acct} />
          </div>
        </div>

        <div style={{ padding: "16px 20px", flex: 1 }}>
          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>Notes</div>
            <textarea
              value={notes}
              onChange={e => saveNotes(e.target.value)}
              placeholder="Add account notes..."
              style={{ width: "100%", minHeight: 72, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#111827", resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* Signals */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 8 }}>
              Signals ({signals.length})
            </div>
            {signals.length === 0 ? (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>No signals scanned yet. Use Scan Actions in the Accounts tab.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {signals.map(sig => (
                  <SigCard key={sig.id || sig.headline} sig={sig} highlighted={sig.id === highlightSigId} />
                ))}
              </div>
            )}
          </div>

          {/* Contacts */}
          {contacts.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 8 }}>Contacts ({contacts.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {contacts.map(c => {
                  const sc = STATUS_COLORS[c.status] || STATUS_COLORS["Not started"];
                  return (
                    <div
                      key={c.id}
                      onClick={() => onContactClick(c)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#f9fafb", borderRadius: 7, cursor: "pointer", border: "1px solid #e5e7eb" }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#111827" }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "#6b7280" }}>{c.title}</div>
                      </div>
                      <span style={{ background: sc.bg, color: sc.text, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{c.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Outreach sequences */}
          {contacts.some(c => c.outreach?.length > 0) && (
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 10 }}>Outreach Sequences</div>
              {contacts.filter(c => c.outreach?.length > 0).map(c => (
                <div key={c.id} style={{ marginBottom: 16, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "8px 12px", background: "#f9fafb", fontWeight: 600, fontSize: 13, color: "#374151" }}>
                    {c.name} — {c.title}
                  </div>
                  {c.outreach.map(touch => (
                    <div key={touch.touch} style={{ padding: "10px 12px", borderTop: "1px solid #f3f4f6" }}>
                      <div style={{ fontWeight: 600, fontSize: 12, color: "#6b7280", marginBottom: 4 }}>Touch {touch.touch}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 4 }}>{touch.subject}</div>
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap", marginBottom: 8 }}>{touch.body}</div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => copyText(touch.subject + "\n\n" + touch.body)}
                          style={{ padding: "3px 10px", fontSize: 12, borderRadius: 5, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", cursor: "pointer" }}
                        >
                          Copy
                        </button>
                        <a
                          href={gmailLink(touch.subject, touch.body)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: "3px 10px", fontSize: 12, borderRadius: 5, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", textDecoration: "none" }}
                        >
                          Gmail
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
