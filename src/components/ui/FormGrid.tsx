// FILE: teacher-app/src/components/ui/FormGrid.tsx
// Source: admin App.tsx -> FormGrid [1030-1041]
// @ts-nocheck

export const FormGrid = ({ children, cols = 2 }) => (
  <div
    className="form-grid-responsive"
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${cols},1fr)`,
      gap: 14,
    }}
  >
    {children}
  </div>
);
