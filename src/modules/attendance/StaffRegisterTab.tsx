// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/client";
import { useDialog } from "../../contexts/DialogContext";
import { openGeneratedPdf } from "../../utils/fetchDoc";
import { RegisterGrid } from "./RegisterGrid";
import { todayISO } from "../../utils/date";

// Teachers: monthly attendance register of all teaching staff (reuses GET /attendance/staff/analysis?month=)
export const StaffRegisterTab = () => {
  const maxMonth = todayISO().slice(0, 7);
  const [month, setMonth] = useState(maxMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);
  const { dialogAlert } = useDialog();
  const [pdfBusy, setPdfBusy] = useState(false);
  const openPdf = async () => {
    setPdfBusy(true);
    try { await openGeneratedPdf(`/attendance/staff/analysis?month=${month}&format=pdf`, { name: `Attendance Register ${month}.pdf`, title: "Attendance Register" }); }
    catch (e) { await dialogAlert(e.message || "Could not generate the PDF", "PDF failed"); }
    finally { setPdfBusy(false); }
  };

  useEffect(() => {
    const my = ++seq.current;
    setLoading(true);
    (async () => {
      try {
        const res = await apiRequest(`/attendance/staff/analysis?month=${month}`);
        if (my === seq.current) setData(res?.data?.register || null);
      } catch (e) { if (my === seq.current) setData(null); console.error(e); }
      finally { if (my === seq.current) setLoading(false); }
    })();
  }, [month]);

  return <RegisterGrid who="Teacher" data={data} loading={loading} month={month} setMonth={setMonth} maxMonth={maxMonth} onPdf={openPdf} pdfBusy={pdfBusy} />;
};
