import { useCallback, useEffect, useState } from "react";
import PriorityTab from "./tabs/PriorityTab.jsx";
import AccountsTab from "./tabs/AccountsTab.jsx";
import CriteriaTab from "./tabs/CriteriaTab.jsx";
import SettingsTab from "./tabs/SettingsTab.jsx";
import { DEFAULT_SIG_CRITERIA, DEFAULT_MSG_CRITERIA } from "./lib/constants.js";
import { getProviders, loadData, saveAccountToDb, deleteAccountFromDb, saveSettingToDb } from "./lib/api.js";

const TABS = ["Priority", "Accounts", "Criteria", "Settings"];

export default function App() {
  const [tab, setTab] = useState("Priority");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [sigCriteria, setSigCriteria] = useState(DEFAULT_SIG_CRITERIA);
  const [msgCriteria, setMsgCriteria] = useState(DEFAULT_MSG_CRITERIA);
  const [provider, setProvider] = useState("agent");
  const [aiProvider, setAiProvider] = useState("auto");
  const [availableProviders, setAvailableProviders] = useState({ agent: true, brave: false, tavily: false, anthropic: false, openai: false });
  const [saveMsg, setSaveMsg] = useState("");
  const [serverOk, setServerOk] = useState(null);

  useEffect(() => {
    loadData()
      .then(({ accounts: saved, settings }) => {
        if (saved?.length > 0) setAccounts(saved);
        if (settings?.sigCriteria) setSigCriteria(settings.sigCriteria);
        if (settings?.msgCriteria) setMsgCriteria(settings.msgCriteria);
        if (settings?.provider) setProvider(settings.provider);
        if (settings?.aiProvider) setAiProvider(settings.aiProvider);
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

  function handleAiProviderChange(p) {
    setAiProvider(p);
    saveSettingToDb("aiProvider", p);
  }

  function handleCriteriaChange(type, val) {
    if (type === "sig") setSigCriteria(val);
    else setMsgCriteria(val);
  }

  const handleAccountUpdated = useCallback((updated) => {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSelectedAccount(prev => prev?.id === updated.id ? updated : prev);
    saveAccountToDb(updated).catch(e => console.error("[save]", e.message));
  }, []);

  function handleSelectAccount(acct) {
    setSelectedAccount(acct);
    setTab("Accounts");
  }

  function handleBack() {
    setSelectedAccount(null);
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
    setSelectedAccount(null);
  }

  const hasNewSigs = accounts.some(a => (a.signals || []).some(s => s.isNew));
  const readyCount = accounts.reduce((n, a) => n + (a.contacts || []).filter(c => c.outreach?.length > 0 && c.status === "Not started").length, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <header style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 20px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#111827", letterSpacing: "-0.5px" }}>Sierra Signals</span>
              {serverOk === false && (
                <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                  Server offline — run npm run dev
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {saveMsg && <span style={{ fontSize: 12, color: "#16a34a" }}>{saveMsg}</span>}
              <button onClick={manualSave} style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Save
              </button>
            </div>
          </div>

          <nav style={{ display: "flex", gap: 0 }}>
            {TABS.map(t => {
              const active = tab === t && !(t === "Accounts" && selectedAccount);
              const isAccountDetail = t === "Accounts" && !!selectedAccount;
              return (
                <button key={t}
                  onClick={() => { setTab(t); if (t !== "Accounts") setSelectedAccount(null); }}
                  style={{ padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontWeight: tab === t ? 700 : 500, fontSize: 14, color: tab === t ? "#1d4ed8" : "#6b7280", borderBottom: tab === t ? "2px solid #3b82f6" : "2px solid transparent", position: "relative", transition: "color 0.1s" }}
                >
                  {t}
                  {t === "Priority" && hasNewSigs && (
                    <span style={{ position: "absolute", top: 8, right: 6, width: 6, height: 6, background: "#ef4444", borderRadius: "50%" }} />
                  )}
                  {t === "Priority" && readyCount > 0 && (
                    <span style={{ marginLeft: 5, background: "#22c55e", color: "#fff", borderRadius: 10, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{readyCount}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 20px" }}>
        {tab === "Priority" && (
          <PriorityTab accounts={accounts} onSelectAccount={handleSelectAccount} />
        )}
        {tab === "Accounts" && (
          <AccountsTab
            accounts={accounts}
            selectedAccount={selectedAccount}
            onSelectAccount={handleSelectAccount}
            onBack={handleBack}
            sigCriteria={sigCriteria}
            msgCriteria={msgCriteria}
            provider={provider}
            onProviderChange={handleProviderChange}
            aiProvider={aiProvider}
            availableProviders={availableProviders}
            onAccountUpdated={handleAccountUpdated}
            onImport={handleImport}
          />
        )}
        {tab === "Criteria" && (
          <CriteriaTab sigCriteria={sigCriteria} msgCriteria={msgCriteria} onChange={handleCriteriaChange} />
        )}
        {tab === "Settings" && (
          <SettingsTab
            accounts={accounts}
            onImport={handleImport}
            onClear={handleClear}
            aiProvider={aiProvider}
            onAiProviderChange={handleAiProviderChange}
            availableProviders={availableProviders}
          />
        )}
      </main>
    </div>
  );
}
