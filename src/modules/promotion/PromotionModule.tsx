// FILE: teacher-app/src/modules/promotion/PromotionModule.tsx
// Source: admin App.tsx -> PromotionModule [8652-8797]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormRow } from "../../components/ui/FormRow";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useSession } from "../../contexts/SessionContext";
import { PromoteStudentsTab } from "./PromoteStudentsTab";
import { PromotionHistoryTab } from "./PromotionHistoryTab";
import { PromotionOverviewTab } from "./PromotionOverviewTab";
import { SectionTransferTab } from "./SectionTransferTab";
import { C } from "../../theme/theme";

// end TeachersModule


// 🔴 PROMOTION & SESSION-TRANSITION MODULE — year-end promote/retain/TC, full stats
export const PromotionModule = () => {
  const { academicYears, currentYear } = useSession();
  const [tab, setTab] = useState("overview"); // 'overview' | 'promote' | 'history'

  const [fromYearId, setFromYearId] = useState("");
  const [toYearId, setToYearId] = useState("");

  useEffect(() => {
    if (currentYear) {
      setFromYearId(currentYear.id); // topbar session badalte hi sync
      setToYearId((t) => (t === currentYear.id ? "" : t));
    }
  }, [currentYear?.id]); // eslint-disable-line

  // ── Overview state ──
  const [overview, setOverview] = useState(null);
  const [ovLoading, setOvLoading] = useState(true);

  const loadOverview = async () => {
    if (!fromYearId) return;
    setOvLoading(true);
    try {
      const qs = new URLSearchParams({ from_academic_year_id: fromYearId });
      if (toYearId) qs.set("to_academic_year_id", toYearId);
      const res = await apiRequest(`/promotion/overview?${qs.toString()}`);
      setOverview(res?.data || null);
    } catch (e) {
      console.error(e.message);
    } finally {
      setOvLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "overview") loadOverview();
  }, [tab, fromYearId, toYearId]); // eslint-disable-line

  // ── History state ──
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(true);

  const loadHistory = async () => {
    setHistLoading(true);
    try {
      const res = await apiRequest(`/promotion/history`);
      setHistory(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error(e.message);
    } finally {
      setHistLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab]); // eslint-disable-line

  const t = overview?.totals || { total: 0, processed: 0, pending: 0, promoted: 0, retained: 0, tc: 0, graduated: 0 };

  return (
    <div>
      <SectionHeader
        title="Promotion & Session Transition"
        sub="Year-end promote/retain students, issue TC, and track full history — session-safe, nothing overwritten."
      />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: `1px solid ${C.border}` }}>
        {[
          { id: "overview", label: "Overview" },
          { id: "promote", label: "Promote Students" },
          { id: "transfer", label: "Section Transfer" },
          { id: "history", label: "History" },
        ].map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={tab === tb.id ? "tab-active" : "tab-inactive"}
            style={{
              padding: "10px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13.5,
              color: tab === tb.id ? C.blue : C.textMuted,
              borderBottom: tab === tb.id ? `2px solid ${C.blue}` : "2px solid transparent",
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Year selector row — shared across Overview + Promote */}
      {tab !== "history" && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <FormRow label="From Session (current class list)">
            <select className="select" value={fromYearId} onChange={(e) => setFromYearId(e.target.value)}>
              <option value="">Select session</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.is_current ? " (Current)" : ""}
                </option>
              ))}
            </select>
          </FormRow>
          <FormRow label="To Session (promote into)">
            <select className="select" value={toYearId} onChange={(e) => setToYearId(e.target.value)}>
              <option value="">Select session</option>
              {academicYears
                .filter((y) => y.id !== fromYearId)
                .map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
            </select>
          </FormRow>
        </div>
      )}

      {tab === "overview" && (
        <PromotionOverviewTab
          overview={overview}
          loading={ovLoading}
          totals={t}
          toYearId={toYearId}
          onPromoteSection={() => setTab("promote")}
        />
      )}

      {tab === "promote" && (
        <PromoteStudentsTab
          fromYearId={fromYearId}
          toYearId={toYearId}
          onDone={() => {
            setTab("overview");
            loadOverview();
          }}
        />
      )}

      {tab === "transfer" && <SectionTransferTab />}
      {tab === "history" && <PromotionHistoryTab history={history} loading={histLoading} />}
    </div>
  );
};
