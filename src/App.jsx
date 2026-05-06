import { useCallback, useEffect, useRef, useState } from "react";
import PriorityTab from "./tabs/PriorityTab.jsx";
import SignalsTab from "./tabs/SignalsTab.jsx";
import AccountsTab from "./tabs/AccountsTab.jsx";
import ContactsTab from "./tabs/ContactsTab.jsx";
import CriteriaTab from "./tabs/CriteriaTab.jsx";
import SettingsTab from "./tabs/SettingsTab.jsx";
import SignalPanel from "./components/SignalPanel.jsx";
import ContactPanel from "./components/ContactPanel.jsx";
import { DEFAULT_SIG_CRITERIA, DEFAULT_MSG_CRITERIA } from "./lib/constants.js";
import { getProviders, loadData, saveAccountToDb, deleteAccountFromDb, saveSettingToDb } from "./lib/api.js";

const TABS = ["Priority", "Signals", "Accounts", "Contacts", "Criteria", "Settings"];

export default function App() {
  const [tab, setTab] = useState("Priority");
  const [accounts, setAccounts] = useState([]);
  const [sigCriteria, setSigCriteria] = useState(DEFAULT_SIG_CRITERIA);
  const [msgCriteria, setMsgCriteria] = useState(DEFAULT_MSG_CRITERIA);
  const [provider, setProvider] = useState("agent");
  const [availableProviders, setAvailableProviders] = useState({ agent: true, brave: false, tavily: false });
  const [panel, setPanel] = useState(null);  // { type: 'signal'|'contact', acct, contact?, sigId? }
  const [saveMsg, setSaveMsg] = useState("");
  const [serverOk, setServerOk] = useState(null);
  const saveTimer = useRef(null);

  // Load on mount from server DB
  useEffect(() => {
    loadData()
      .then(({ accounts: saved, settings }) => {
        if (saved?.length > 0) setAccounts(saved);
        if (settings?.sigCriteria) setSigCriteria(settings.sigCriteria);
        if (settings?.msgCriteria) setMsgCriteria(settings.msgCriteria);
        if (settings?.provider) setProvider(settings.provider);
        return getProviders();
      })
      .then(p => { setAvailableProviders(p); setServerOk(true); })
      .catch(() => setServerOk(false));
  }, []);

  function manualSave() {
    accounts.forEach(a => saveAccountToDb(a));
    saveSettingToDb("sigCriteria", sigCriteria);
    saveSettingToDb("msgCriteria", msgCriteria);
    const total = accounts.reduce((n, a) => n + (a.signals || []).length + (a.contacts || []).length, 0);
    setSaveMsg("Saved — " + accounts.length + " accounts, " + total + " items");
    setTimeout(() => setSaveMsg(""), 3000);
  }

  function handleProviderChange(p) {
    setProvider(p);
    saveSettingToDb("provider", p);
  }

  function handleCriteriaChange(type, val) {
    if (type === "sig") setSigCriteria(val);
    else setMsgCriteria(val);
  }

  // Update a single account in state + persist immediately
  const handleAccountUpdated = useCallback((updated) => {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
    saveAccountToDb(updated);
  }, []);

  // Update a contact within its account
  function handleContactUpdated(contact, acct) {
    const updatedAcct = {
      ...acct,
      contacts: (acct.contacts || []).map(c => c.id === contact.id ? contact : c),
    };
    handleAccountUpdated(updatedAcct);
    // If contact panel is open, keep it in sync
    if (panel?.type === "contact") {
      setPanel(p => ({ ...p, contact, acct: updatedAcct }));
    }
  }

  function openSignalPanel(acct, sigId) {
    // Find the latest version of this account from state
    const latest = accounts.find(a => a.id === acct.id) || acct;
    setPanel({ type: "signal", acct: latest, sigId });
  }

  function openContactPanel(contact, acct) {
    const latestAcct = accounts.find(a => a.id === acct.id) || acct;
    const latestContact = (latestAcct.contacts || []).find(c => c.id === contact.id) || contact;
    setPanel({ type: "contact", acct: latestAcct, contact: latestContact });
  }

  function handleImport(parsed) {
    setAccounts(prev => {
      const existingNames = new Set(prev.map(a => (a["Account Name"] || "").toLowerCase()));
      const fresh = parsed.filter(p => !existingNames.has((p["Account Name"] || "").toLowerCase()));
      fresh.forEach(a => saveAccountToDb(a));
      return [...prev, ...fresh];
    });
  }

  function handleClear() {
    accounts.forEach(a => deleteAccountFromDb(a.id));
    setAccounts([]);
    setPanel(null);
  }

  const allSignals = accounts.reduce((n, a) => n + (a.signals || []).length, 0);
  const allContacts = accounts.reduce((n, a) => n + (a.contacts || []).length, 0);
  const hasNewSigs = accounts.some(a => (a.signals || []).some(s => s.isNew));

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Header */}
      <header style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#111827", letterSpacing: "-0.5px" }}>Sierra Signals</span>

              {/* Server status */}
              {serverOk === false && (
                <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                  Server offline — run npm run dev
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {saveMsg && <span style={{ fontSize: 12, color: "#16a34a" }}>{saveMsg}</span>}
              <button
                onClick={manualSave}
                style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Save
              </button>
            </div>
          </div>

          {/* Tab nav */}
          <nav style={{ display: "flex", gap: 0 }}>
            {TABS.map(t => {
              const active = tab === t;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: "10px 16px",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontWeight: active ? 700 : 500,
                    fontSize: 14,
                    color: active ? "#1d4ed8" : "#6b7280",
                    borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
                    position: "relative",
                    transition: "color 0.1s",
                  }}
                >
                  {t}
                  {t === "Signals" && allSignals > 0 && (
                    <span style={{ marginLeft: 5, background: "#3b82f6", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{allSignals}</span>
                  )}
                  {t === "Contacts" && allContacts > 0 && (
                    <span style={{ marginLeft: 5, background: "#6b7280", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{allContacts}</span>
                  )}
                  {t === "Priority" && hasNewSigs && (
                    <span style={{ position: "absolute", top: 8, right: 8, width: 6, height: 6, background: "#ef4444", borderRadius: "50%" }} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {tab === "Priority" && (
          <PriorityTab
            accounts={accounts}
            onAccountClick={openSignalPanel}
            onContactClick={openContactPanel}
          />
        )}
        {tab === "Signals" && (
          <SignalsTab
            accounts={accounts}
            onAccountClick={openSignalPanel}
          />
        )}
        {tab === "Accounts" && (
          <AccountsTab
            accounts={accounts}
            sigCriteria={sigCriteria}
            msgCriteria={msgCriteria}
            provider={provider}
            onProviderChange={handleProviderChange}
            availableProviders={availableProviders}
            onAccountClick={openSignalPanel}
            onAccountUpdated={handleAccountUpdated}
            onImport={handleImport}
          />
        )}
        {tab === "Contacts" && (
          <ContactsTab
            accounts={accounts}
            onContactClick={openContactPanel}
            onAccountUpdated={handleAccountUpdated}
          />
        )}
        {tab === "Criteria" && (
          <CriteriaTab
            sigCriteria={sigCriteria}
            msgCriteria={msgCriteria}
            onChange={handleCriteriaChange}
          />
        )}
        {tab === "Settings" && (
          <SettingsTab
            accounts={accounts}
            onImport={handleImport}
            onClear={handleClear}
          />
        )}
      </main>

      {/* Side panels */}
      {panel?.type === "signal" && (
        <SignalPanel
          acct={accounts.find(a => a.id === panel.acct.id) || panel.acct}
          highlightSigId={panel.sigId}
          onClose={() => setPanel(null)}
          onContactClick={(c) => openContactPanel(c, panel.acct)}
          onAccountUpdated={handleAccountUpdated}
        />
      )}

      {panel?.type === "contact" && (
        <ContactPanel
          contact={panel.contact}
          acct={accounts.find(a => a.id === panel.acct.id) || panel.acct}
          provider={provider}
          msgCriteria={msgCriteria}
          onClose={() => setPanel(null)}
          onContactUpdated={(c) => handleContactUpdated(c, panel.acct)}
        />
      )}
    </div>
  );
}
