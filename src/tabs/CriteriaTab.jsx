import { DEFAULT_SIG_CRITERIA, DEFAULT_MSG_CRITERIA } from "../lib/constants.js";

export default function CriteriaTab({ sigCriteria, msgCriteria, onChange }) {
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 0" }}>
      <h2 style={{ fontWeight: 700, fontSize: 18, color: "#111827", marginBottom: 4 }}>Scan Criteria</h2>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>
        These prompts control how signals are detected and how outreach emails are written. Changes take effect on the next scan.
      </p>

      <Section
        title="Signal Detection Criteria"
        value={sigCriteria}
        onChange={val => onChange("sig", val)}
        onReset={() => onChange("sig", DEFAULT_SIG_CRITERIA)}
      />

      <Section
        title="Messaging Criteria"
        value={msgCriteria}
        onChange={val => onChange("msg", val)}
        onReset={() => onChange("msg", DEFAULT_MSG_CRITERIA)}
        style={{ marginTop: 24 }}
      />
    </div>
  );
}

function Section({ title, value, onChange, onReset, style }) {
  return (
    <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", ...style }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#111827" }}>{title}</div>
        <button
          onClick={onReset}
          style={{ fontSize: 12, color: "#6b7280", background: "none", border: "1px solid #d1d5db", borderRadius: 5, padding: "3px 10px", cursor: "pointer" }}
        >
          Reset to default
        </button>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          display: "block", width: "100%", minHeight: 260, padding: "14px 18px",
          border: "none", outline: "none", resize: "vertical",
          fontFamily: "monospace", fontSize: 13, lineHeight: 1.6, color: "#111827",
        }}
      />
    </div>
  );
}
