// FILE: teacher-app/src/utils/status.ts
// Source: admin App.tsx -> STATUS_META [1089-1094], STATUS_KEYS [1096-1096]
// @ts-nocheck
import { C } from "../theme/theme";

export const STATUS_META = {
  P: { label: "Present", color: C.green },
  A: { label: "Absent", color: C.red },
  L: { label: "Leave", color: C.yellow },
  OD: { label: "On Duty", color: C.blue },
};

export const STATUS_KEYS = ["P", "A", "L", "OD"];

// Staff attendance has two more codes. Payroll rule: P / OD / PL = salary paid, HD = half salary, A / L = salary cut.
export const STAFF_STATUS_KEYS = ["P", "A", "L", "PL", "HD", "OD"];
export const STAFF_STATUS_META = {
  P: STATUS_META.P,
  A: STATUS_META.A,
  L: { label: "Unpaid Leave", color: C.yellow },
  PL: { label: "Paid Leave", color: C.purple },
  HD: { label: "Half Day", color: "#F97316" },
  OD: STATUS_META.OD,
};
