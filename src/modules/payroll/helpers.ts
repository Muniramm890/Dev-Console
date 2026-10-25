// FILE: teacher-app/src/modules/payroll/helpers.ts
// Source: admin App.tsx -> MONTH_NAMES [15676-15676], currentMonthYear [15677-15680], monthLabel [15681-15684], daysInMonth [15685-15688], inr [15689-15689], computePayslip [15692-15735], applyPayslipOverride [15738-15759]
// @ts-nocheck

// ═══════════════════════════════════════════════════════════════
// PAYROLL MODULE — reuses global components (KpiCard, Modal, FormRow,
// FormGrid, Icon, useDialog, C palette, apiRequest, recharts).
// All salary math is computed CLIENT-SIDE from raw attendance + structure data.
// Paste this block into app.jsx (see integration notes at the end).
// ═══════════════════════════════════════════════════════════════

export const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const currentMonthYear = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

// [teacher-app] month math on "YYYY-MM" strings (same format as payslip.month_year)
export const addMonths = (my, n) => {
  const [y, m] = my.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const monthRange = (from, to) => {
  const out = [];
  for (let cur = from; cur <= to && out.length < 60; cur = addMonths(cur, 1)) out.push(cur);
  return out;
};

export const monthLabel = (my) => {
  const [y, m] = my.split("-");
  return `${MONTH_NAMES[+m - 1]} ${y}`;
};

export const daysInMonth = (my) => {
  const [y, m] = my.split("-");
  return new Date(+y, +m, 0).getDate();
};

export const inr = (n) => `₹${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

// ── Pure calculation engine — the heart of client-side payroll math ──
export function computePayslip({ staff, attendanceRows, paidCodeSet, monthYear }) {
  const totalDays = daysInMonth(monthYear);
  let presentDays = 0, paidLeaveDays = 0, lopDays = 0;

  const byStaff = attendanceRows.filter((a) => a.staff_id === staff.staff_id);
  const markedDates = new Set();
  byStaff.forEach((a) => {
    // attendance_date may arrive as a Date object (mssql driver) or a string — normalize safely
    const dateKey = a.attendance_date instanceof Date
      ? a.attendance_date.toISOString().slice(0, 10)
      : String(a.attendance_date).slice(0, 10);
    markedDates.add(dateKey);

    const code = String(a.status || "").toUpperCase().trim();
    if (code === "P" || code === "OD") presentDays += 1;          // Present / On Duty → full paid day
    else if (code === "A") lopDays += 1;                          // Absent → Loss of Pay
    else if (paidCodeSet.has(code)) paidLeaveDays += 1;            // PL/CL/RH/HL etc. (from leave_types, if configured)
    else if (code === "L") paidLeaveDays += 1;                     // Generic "Leave" (current UI default) → treated as paid
    else lopDays += 1;                                             // Unknown code → safety default LOP
  });
  // Unmarked days in the month default to LOP (safety-conservative — school can override by marking attendance)
  const unmarked = totalDays - markedDates.size;
  if (unmarked > 0) lopDays += unmarked;

  const basic = staff.basic || 0, hra = staff.hra || 0, da = staff.da || 0;
  const spl = staff.special_allowance || 0, oa = staff.other_allowance || 0;
  const gross = +(basic + hra + da + spl + oa).toFixed(2);
  const perDayRate = totalDays > 0 ? gross / totalDays : 0;
  const lopDeduction = +(perDayRate * lopDays).toFixed(2);
  const pf = staff.pf_deduction || 0, pt = staff.pt_deduction || 0, od = staff.other_deduction || 0;
  const totalDeduction = +(lopDeduction + pf + pt + od).toFixed(2);
  const netPay = +(gross - totalDeduction).toFixed(2);

  return {
    staff_id: staff.staff_id, full_name: staff.full_name, designation: staff.designation, department: staff.department,
    total_days: totalDays, present_days: presentDays, paid_leave_days: paidLeaveDays,
    lop_days: lopDays, auto_lop_days: lopDays, // auto_lop_days = system baseline, never mutated by override
    basic, hra, da, special_allowance: spl, other_allowance: oa, gross_salary: gross, per_day_rate: perDayRate,
    lop_deduction: lopDeduction, pf_deduction: pf, pt_deduction: pt, other_deduction: od,
    total_deduction: totalDeduction, net_pay: netPay, bonus_amount: 0,
    is_manually_adjusted: false, adjustment_note: "",
    has_salary_structure: staff.has_salary_structure, has_bank_details: staff.has_bank_details,
  };
}

// Recompute a payslip after admin overrides LOP days and/or adds a bonus
export function applyPayslipOverride(base, override) {
  const effectiveLop = override.manual_lop_days !== "" && override.manual_lop_days !== null && override.manual_lop_days !== undefined
    ? Number(override.manual_lop_days)
    : base.auto_lop_days;

  const lopDeduction = +(base.per_day_rate * effectiveLop).toFixed(2);
  const totalDeduction = +(lopDeduction + base.pf_deduction + base.pt_deduction + base.other_deduction).toFixed(2);
  const bonus = Number(override.bonus_amount) || 0;
  const netPay = +(base.gross_salary - totalDeduction + bonus).toFixed(2);
  const isAdjusted = effectiveLop !== base.auto_lop_days || bonus !== 0;

  return {
    ...base,
    lop_days: effectiveLop,
    lop_deduction: lopDeduction,
    total_deduction: totalDeduction,
    bonus_amount: bonus,
    net_pay: netPay,
    is_manually_adjusted: isAdjusted,
    adjustment_note: override.adjustment_note || "",
  };
}
