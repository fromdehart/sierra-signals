import { CAT_COLORS } from "../lib/constants.js";
import { relDate, scoreColor } from "../lib/scoring.js";

export default function SigCard({ sig, accountName, onClick, highlighted }) {
  const colors = CAT_COLORS[sig.category] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
  const sigScore = (sig.relevance_score || 0) * 10;

  return (
    <div
      onClick={onClick}
      style={{
        borderLeft: "4px solid " + colors.border,
        background: highlighted ? "#eff6ff" : "#ffffff",
        border: highlighted ? "1px solid #93c5fd" : "1px solid #e5e7eb",
        borderLeftWidth: 4,
        borderLeftColor: colors.border,
        borderRadius: 8,
        padding: "12px 14px",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ background: colors.bg, color: colors.text, border: "1px solid " + colors.border, borderRadius: 4, padding: "2px 7px", fontSize: 11, fontWeight: 600 }}>
          {sig.category}
        </span>
        {sig.isNew && (
          <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700 }}>NEW</span>
        )}
        {(sig.seenCount || 0) >= 2 && (
          <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 4, padding: "2px 6px", fontSize: 11, fontWeight: 700 }}>TRENDING</span>
        )}
        {accountName && (
          <span style={{ color: "#6b7280", fontSize: 12, marginLeft: "auto" }}>{accountName}</span>
        )}
        <span style={{ color: scoreColor(sigScore), fontWeight: 700, fontSize: 12, marginLeft: accountName ? 0 : "auto" }}>
          {sigScore}
        </span>
        <span style={{ color: "#9ca3af", fontSize: 12 }}>{relDate(sig.date)}</span>
      </div>

      <div style={{ fontWeight: 600, fontSize: 14, color: "#111827", marginBottom: 4 }}>{sig.headline}</div>
      <div style={{ color: "#4b5563", fontSize: 13, lineHeight: 1.5, marginBottom: 6 }}>{sig.summary}</div>

      {sig.source_url && (
        <a
          href={sig.source_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ color: "#3b82f6", fontSize: 12, textDecoration: "none" }}
        >
          {sig.source_name || "Source"} →
        </a>
      )}
    </div>
  );
}
