import { CAT_COLORS } from "../lib/constants.js";

export default function CatBar({ signals, activeCategory, onChange }) {
  const cats = [...new Set((signals || []).map(s => s.category).filter(Boolean))];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      <button
        onClick={() => onChange(null)}
        style={{
          padding: "4px 12px",
          borderRadius: 6,
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 12,
          background: !activeCategory ? "#111827" : "#f9fafb",
          color: !activeCategory ? "#ffffff" : "#374151",
          transition: "background 0.1s",
        }}
      >
        All
      </button>
      {cats.map(cat => {
        const colors = CAT_COLORS[cat] || { bg: "#f3f4f6", text: "#374151", border: "#d1d5db" };
        const active = activeCategory === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(active ? null : cat)}
            style={{
              padding: "4px 12px",
              borderRadius: 6,
              border: "1px solid " + (active ? colors.border : "#e5e7eb"),
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 12,
              background: active ? colors.bg : "#f9fafb",
              color: active ? colors.text : "#374151",
              transition: "background 0.1s",
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
