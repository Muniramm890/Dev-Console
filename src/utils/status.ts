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
