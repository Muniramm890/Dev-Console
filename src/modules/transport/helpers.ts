// FILE: teacher-app/src/modules/transport/helpers.ts
// Source: admin App.tsx -> paiseToRupee [9235-9235]
// @ts-nocheck

// ══════════════════════════════════════════════════════════════════════════
// TRANSPORT MANAGEMENT MODULE
// Reuses: Modal, FormRow, KpiCard, .card/.table/.badge/.btn classes, useDialog, apiRequest
// ══════════════════════════════════════════════════════════════════════════

export const paiseToRupee = (p) => (Number(p || 0) / 100).toFixed(0);
