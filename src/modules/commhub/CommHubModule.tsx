// FILE: teacher-app/src/modules/commhub/CommHubModule.tsx
// Source: admin App.tsx -> CommHubModule [10096-10131]
// [teacher-app] Renamed "Communication Hub" -> "Announcements" and redesigned (same tab pattern as Fees/Transport: PillTabs).
// Module id / URL / permission key stay "commhub".
// @ts-nocheck
import { useState } from "react";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { PillTabs } from "../../components/ui/PillTabs";
import { useSession } from "../../contexts/SessionContext";
import { ComposeMessageTab } from "./ComposeMessageTab";
import { MessageHistoryTab } from "./MessageHistoryTab";

export const CommHubModule = () => {
  const { currentYear } = useSession();
  const [tab, setTab] = useState("compose"); // 'compose' | 'history'

  return (
    <div className="slide-in">
      <SectionHeader
        title="Announcements"
        sub="Send targeted notices to students and staff — in-app and email, with attachments."
      />

      <PillTabs
        tabs={[
          { id: "compose", label: "Compose", icon: "edit" },
          { id: "history", label: "History", icon: "result" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "compose" && <ComposeMessageTab academicYearId={currentYear?.id} onSent={() => setTab("history")} />}
      {tab === "history" && <MessageHistoryTab onCompose={() => setTab("compose")} />}
    </div>
  );
};
