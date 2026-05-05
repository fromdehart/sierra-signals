import { useEffect, useState } from "react";
import { STATUS_COLORS, STATUSES } from "../lib/constants.js";
import { enrichContact, generateOutreach } from "../lib/scan.js";

export default function ContactPanel({ contact, acct, provider, msgCriteria, onClose, onContactUpdated }) {
  const [notes, setNotes] = useState(contact?.notes || "");
  const [status, setStatus] = useState(contact?.status || "Not started");
  const [enriching, setEnriching] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setNotes(contact?.notes || "");
    setStatus(contact?.status || "Not started");
  }, [contact?.id]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!contact || !acct) return null;

  function save(patch) {
    onContactUpdated({ ...contact, ...patch });
  }

  function saveNotes(val) {
    setNotes(val);
    save({ notes: val });
  }

  function saveStatus(val) {
    setStatus(val);
    save({ status: val });
  }

  async function doEnrich() {
    setEnriching(true);
    try {
      const data = await enrichContact(contact, acct, provider);
      if (data) save({ ...data });
    } catch (e) {
      console.error("Enrich error:", e);
    }
    setEnriching(false);
  }

  async function doGenerate() {
    setGenerating(true);
    try {
      const outreach = await generateOutreach(contact, acct, acct.signals, msgCriteria, provider);
      save({ outreach });
    } catch (e) {
      console.error("Outreach error:", e);
    }
    setGenerating(false);
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  function gmailLink(subject, body) {
    return "https://mail.google.com/mail/?view=cm&su=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  const sc = STATUS_COLORS[status] || STATUS_COLORS["Not started"];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 60 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 520, maxWidth: "100vw",
        background: "#ffffff", zIndex: 70, overflowY: "auto", boxShadow: "-4px 0 24px rgba(0,0,0,0.12)",
      }}>
        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, background: "#ffffff", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>
                {contact.name}
                {contact.appointed_recently && (
                  <span style={{ marginLeft: 8, background: "#dbeafe", color: "#1e40af", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>New in role</span>
                )}
                {contact.from_signal && (
                  <span style={{ marginLeft: 6, background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 700 }}>From signal</span>
                )}
              </div>
              <div style={{ color: "#6b7280", fontSize: 13, marginTop: 2 }}>{contact.title} · {acct["Account Name"]}</div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, color: "#9ca3af", cursor: "pointer" }}>×</button>
          </div>

          {/* Badges row */}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {contact.verified === true && (
              <span style={{ background: "#d1fae5", color: "#065f46", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>✓ Verified</span>
            )}
            {contact.verified === false && (
              <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>✗ Check role</span>
            )}

            {/* Status */}
            <select
              value={status}
              onChange={e => saveStatus(e.target.value)}
              style={{ background: sc.bg, color: sc.text, border: "none", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* Rationale */}
          {contact.rationale && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 4 }}>Why identified</div>
              <div style={{ color: "#4b5563", fontSize: 13, lineHeight: 1.6 }}>{contact.rationale}</div>
            </div>
          )}

          {/* Verification note */}
          {contact.verification_note && (
            <div style={{ marginBottom: 16, background: "#f9fafb", borderRadius: 7, padding: "10px 12px" }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 4 }}>Verification</div>
              <div style={{ color: "#4b5563", fontSize: 13 }}>{contact.verification_note}</div>
            </div>
          )}

          {/* Enrichment */}
          {contact.enrichment && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>Contact Intelligence</div>
              <div style={{ color: "#4b5563", fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{contact.enrichment.insight}</div>
              {contact.enrichment.quote && (
                <blockquote style={{ borderLeft: "3px solid #3b82f6", paddingLeft: 12, margin: 0, color: "#1e40af", fontSize: 13, fontStyle: "italic", lineHeight: 1.6 }}>
                  "{contact.enrichment.quote}"
                  {contact.enrichment.source && (
                    <div style={{ marginTop: 4 }}>
                      <a href={contact.enrichment.source} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", fontSize: 12, fontStyle: "normal" }}>Source →</a>
                    </div>
                  )}
                </blockquote>
              )}
            </div>
          )}

          {/* LinkedIn / Enrich */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
            {contact.linkedin_search && (
              <a
                href={"https://www.linkedin.com/search/results/people/?keywords=" + encodeURIComponent(contact.linkedin_search)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: "5px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db", background: "#f9fafb", color: "#374151", textDecoration: "none" }}
              >
                LinkedIn →
              </a>
            )}
            <button
              onClick={doEnrich}
              disabled={enriching}
              style={{ padding: "5px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", color: enriching ? "#9ca3af" : "#374151", cursor: enriching ? "not-allowed" : "pointer" }}
            >
              {enriching ? "Enriching..." : contact.enrichment ? "Re-enrich" : "Enrich"}
            </button>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 6 }}>Notes</div>
            <textarea
              value={notes}
              onChange={e => saveNotes(e.target.value)}
              placeholder="Add notes about this contact..."
              style={{ width: "100%", minHeight: 72, padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {/* Outreach */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151" }}>Outreach Sequence</div>
              <button
                onClick={doGenerate}
                disabled={generating}
                style={{ padding: "5px 12px", fontSize: 13, borderRadius: 6, border: "1px solid #3b82f6", background: generating ? "#f9fafb" : "#eff6ff", color: generating ? "#9ca3af" : "#1d4ed8", cursor: generating ? "not-allowed" : "pointer", fontWeight: 600 }}
              >
                {generating ? "Generating..." : contact.outreach?.length ? "Regenerate" : "Generate"}
              </button>
            </div>

            {contact.outreach?.length > 0 ? (
              contact.outreach.map(touch => (
                <div key={touch.touch} style={{ marginBottom: 14, border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "7px 12px", background: "#f9fafb", fontWeight: 600, fontSize: 12, color: "#6b7280" }}>Touch {touch.touch}</div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#111827", marginBottom: 4 }}>{touch.subject}</div>
                    <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 8 }}>{touch.body}</div>
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
                </div>
              ))
            ) : (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>No outreach generated yet.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
