// @ts-nocheck
// Quick Test 2.0 - online tests on the new SQL based system (/api/cbt). The old "Quick Tests" (Google Sheet) module is untouched.
// (redeploy trigger: no functional change)
import { useState } from "react";
import { PillTabs } from "../../components/ui/PillTabs";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useAuth } from "../../contexts/AuthContext";
import { AnalyticsView } from "./AnalyticsView";
import { QuestionBankTab } from "./QuestionBankTab";
import { ResultsView } from "./ResultsView";
import { SettingsTab } from "./SettingsTab";
import { TestsTab } from "./TestsTab";

export const QuickTest2Module = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState("tests");
  const [view, setView] = useState(null); // { kind: "results" | "analytics", test }
  const tabs = [{ id: "tests", label: "Tests", icon: "test" }, { id: "bank", label: "Question Bank", icon: "book" }, { id: "settings", label: "Settings", icon: "setup" }];

  if (view && view.kind === "results") return <ResultsView test={view.test} onBack={() => setView(null)} />;
  if (view && view.kind === "analytics") return <AnalyticsView test={view.test} onBack={() => setView(null)} />;
  return (
    <div className="slide-in">
      <SectionHeader title="Quick Test 2.0" sub="Question bank, online tests, results and analytics" />
      <PillTabs tabs={tabs} active={tab} onChange={setTab} />
      {tab === "tests" && <TestsTab onResults={(t) => setView({ kind: "results", test: t })} onAnalytics={(t) => setView({ kind: "analytics", test: t })} />}
      {tab === "bank" && <QuestionBankTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
};
