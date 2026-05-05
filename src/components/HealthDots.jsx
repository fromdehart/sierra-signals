export default function HealthDots({ acct }) {
  const dots = [
    { label: "Signals scanned",   on: !!acct.scannedAt },
    { label: "Has signals",        on: (acct.signals || []).length > 0 },
    { label: "Contacts found",     on: (acct.contacts || []).length > 0 },
    { label: "Outreach generated", on: (acct.contacts || []).some(c => c.outreach) },
  ];

  return (
    <div style={{ display: "flex", gap: 4 }}>
      {dots.map(d => (
        <div
          key={d.label}
          title={d.label}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: d.on ? "#22c55e" : "#d1d5db",
            cursor: "default",
          }}
        />
      ))}
    </div>
  );
}
