// FILE: teacher-app/src/shared/subjects/FF.tsx
// Source: admin App.tsx -> FF [1168-1229]
// @ts-nocheck
import { FormRow } from "../../components/ui/FormRow";
import { C } from "../../theme/theme";

// ✅ Module-level — TeachersModule ke BAHAR
export const FF = ({
  label,
  name,
  type = "text",
  options,
  placeholder,
  hint,
  form,
  setF,
    }) => (
     <FormRow label={label}>
       {options ? (
         <select
          className="select"
           value={form[name] || ""}
           onChange={(e) => setF(name, e.target.value)}
            >
        {options.map((o) => (
          <option key={o.v ?? o} value={o.v ?? o}>
            {o.l ?? o}
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
          style={{
            width: 15,
            height: 15,
            cursor: "pointer",
            accentColor: C.primary,
          }}
        />
        <span style={{ color: C.textMuted }}>Yes</span>
      </label>
    ) : (
      <input
        className="input"
        type={type}
        placeholder={placeholder || ""}
        value={form[name] || ""}
        onChange={(e) => setF(name, e.target.value)}
      />
    )}
    {hint && (
      <div style={{ fontSize: 10.5, color: C.textMuted, marginTop: 4 }}>
        {hint}
      </div>
    )}
  </FormRow>
);
