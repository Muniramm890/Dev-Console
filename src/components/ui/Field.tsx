// FILE: teacher-app/src/components/ui/Field.tsx
// Source: admin App.tsx -> Field [1043-1087]
// @ts-nocheck
import { FormRow } from "./FormRow";
import { C } from "../../theme/theme";

export const Field = ({ label, name, type = "text", options, form, setF }) => (
  <FormRow label={label}>
    {options ? (
      <select
        className="select"
        value={form[name] || ""}
        onChange={(e) => setF(name, e.target.value)}
      >
        {options.map((o) => (
          <option
            key={o.v !== undefined ? o.v : o}
            value={o.v !== undefined ? o.v : o}
          >
            {o.l !== undefined ? o.l : o}
          </option>
        ))}
      </select>
    ) : type === "checkbox" ? (
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          cursor: "pointer",
          fontSize: 13,
        }}
      >
        <input
          type="checkbox"
          checked={!!form[name]}
          onChange={(e) => setF(name, e.target.checked)}
          style={{ width: 15, height: 15, cursor: "pointer" }}
        />
        <span style={{ color: C.textMuted }}>Yes</span>
      </label>
    ) : (
      <input
        className="input"
        type={type}
        value={form[name] || ""}
        onChange={(e) => setF(name, e.target.value)}
      />
    )}
  </FormRow>
);
