// FILE: teacher-app/src/modules/timetable/PeriodStructureTab.tsx
// Source: admin App.tsx -> PeriodStructureTab [10674-10921]
// @ts-nocheck
import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client";
import { FormGrid } from "../../components/ui/FormGrid";
import { FormRow } from "../../components/ui/FormRow";
import { Icon } from "../../components/ui/Icon";
import { Modal } from "../../components/ui/Modal";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { useDialog } from "../../contexts/DialogContext";
import { C } from "../../theme/theme";

// ═══════════════════════════════════════════════════════════════
// TAB 1: PERIOD STRUCTURE
// ═══════════════════════════════════════════════════════════════
export const PeriodStructureTab = () => {
  const { dialogConfirm } = useDialog();
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    period_number: "",
    label: "",
    start_time: "",
    end_time: "",
    is_break: false,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/timetable/periods");
      setPeriods(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    if (
      periods.length > 0 &&
      !(await dialogConfirm("This will replace your existing period structure. Continue?", "Regenerate Periods?"))
    )
      return;
    setGenerating(true);
    try {
      await apiRequest("/timetable/periods/generate-defaults", "POST");
      await load();
    } catch (e) {
      alert("Failed: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleAdd = async () => {
    if (
      !form.period_number ||
      !form.label ||
      !form.start_time ||
      !form.end_time
    ) {
      alert("All fields are required.");
      return;
    }
    try {
      await apiRequest("/timetable/periods", "POST", form);
      setShowAdd(false);
      setForm({
        period_number: "",
        label: "",
        start_time: "",
        end_time: "",
        is_break: false,
      });
      await load();
    } catch (e) {
      alert("Failed: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    if (!(await dialogConfirm("Remove this period slot?", "Remove Period"))) return;
    try {
      await apiRequest(`/timetable/periods/${id}`, "DELETE");
      await load();
    } catch (e) {
      alert("Failed: " + e.message);
    }
  };

  return (
    <div>
      {periods.length === 0 && !loading ? (
        <div
          className="card"
          style={{
            textAlign: "center",
            padding: 40,
            border: `2px dashed ${C.border}`,
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 12 }}>🕐</div>
          <h3
            className="syne"
            style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}
          >
            No Period Structure Yet
          </h3>
          <p style={{ color: C.textMuted, fontSize: 13, marginBottom: 20 }}>
            Auto-generate periods from your School Setup timings, or add them
            manually.
          </p>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Auto-Generate from School Settings"}
          </button>
        </div>
      ) : (
        <>
          <SectionHeader
            title="Daily Period Structure"
            sub="These periods repeat every day and define your timetable grid"
            action={
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-ghost"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? "Regenerating…" : "Regenerate Defaults"}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowAdd(true)}
                >
                  <Icon name="plus" size={13} /> Add Period
                </button>
              </div>
            }
          />
          <div className="card table-scroll" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Label</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Type</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {periods.map((p) => (
                  <tr key={p.id}>
                    <td>{p.period_number}</td>
                    <td style={{ fontWeight: 600 }}>{p.label}</td>
                    <td>{p.start_time}</td>
                    <td>{p.end_time}</td>
                    <td>
                      {p.is_break ? (
                        <span className="badge badge-yellow">Break</span>
                      ) : (
                        <span className="badge badge-blue">Class</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "4px 8px" }}
                        onClick={() => handleDelete(p.id)}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Period Slot"
      >
        <FormGrid cols={2}>
          <FormRow label="Period Number">
            <input
              className="input"
              type="number"
              value={form.period_number}
              onChange={(e) =>
                setForm({ ...form, period_number: e.target.value })
              }
            />
          </FormRow>
          <FormRow label="Label">
            <input
              className="input"
              placeholder="e.g. Period 9 / Lunch"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </FormRow>
        </FormGrid>
        <FormGrid cols={2}>
          <FormRow label="Start Time">
            <input
              className="input"
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </FormRow>
          <FormRow label="End Time">
            <input
              className="input"
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </FormRow>
        </FormGrid>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            marginTop: 8,
          }}
        >
          <input
            type="checkbox"
            checked={form.is_break}
            onChange={(e) => setForm({ ...form, is_break: e.target.checked })}
          />
          This is a break (Lunch/Assembly) — not assignable to subjects
        </label>
        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 16 }}
          onClick={handleAdd}
        >
          Add Period
        </button>
      </Modal>
    </div>
  );
};
