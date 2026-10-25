// FILE: teacher-app/src/contexts/DialogContext.tsx
// Source: admin App.tsx -> DialogContext, DialogProvider, useDialog
// @ts-nocheck
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Modal } from "../components/ui/Modal";
import { C } from "../theme/theme";

export const DialogContext = createContext(null);

export const DialogProvider = ({ children }) => {
  const [state, setState] = useState(null); // { type, title, message, resolve }

  // useCallback([]): in dono ki identity kabhi nahi badalti, isliye jin hooks ke dependency
  // array me dialogAlert hai wo dialog khulne/band hone par dobara fetch nahi karte.
  const dialogAlert = useCallback(
    (message, title = "Notice") =>
      new Promise((resolve) => {
        setState({ type: "alert", title, message, resolve });
      }),
    []
  );

  const dialogConfirm = useCallback(
    (message, title = "Please Confirm") =>
      new Promise((resolve) => {
        setState({ type: "confirm", title, message, resolve });
      }),
    []
  );

  const ctxValue = useMemo(() => ({ dialogAlert, dialogConfirm }), [dialogAlert, dialogConfirm]);

    const close = (result) => {
      state?.resolve(result);
      setState(null);
    };
  
    // 🔴 Global override: har window.alert(...) call (chahe kahin bhi ho) ab
    // isi styled dialog se dikhega — har module ko manually edit karne ki zaroorat nahi.
    useEffect(() => {
      const originalAlert = window.alert;
      window.alert = (message) => {
        const msg = String(message ?? "");
        const isError = /❌|error|failed/i.test(msg);
        dialogAlert(msg, isError ? "⚠ Error" : "Notice");
      };
      return () => { window.alert = originalAlert; };
    }, [dialogAlert]);
  
    return (
      <DialogContext.Provider value={ctxValue}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(state?.type === "confirm" ? false : undefined)}
        title={state?.title || ""}
        width={420}
        zIndex={10000} /* 🔴 FIX: Wizard (9999) के ऊपर दिखने के लिए Z-Index 10000 कर दिया */
      >

        {state && (
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <div
              style={{
                fontSize: 14,
                color: C.text,
                lineHeight: 1.6,
                marginBottom: 22,
                whiteSpace: "pre-line",
              }}
            >
              {state.message}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              {state.type === "confirm" && (
                <button className="btn btn-ghost" onClick={() => close(false)}>
                  Cancel
                </button>
              )}
              <button
                className={state.type === "confirm" ? "btn btn-danger" : "btn btn-primary"}
                style={{ minWidth: 100 }}
                onClick={() => close(true)}
              >
                {state.type === "confirm" ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DialogContext.Provider>
  );
};

export const useDialog = () => useContext(DialogContext);
