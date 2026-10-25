// @ts-nocheck
import { useEffect, useRef } from "react";

// fn ko har `ms` par chalata hai, sirf jab tab visible ho. Tab wapas dikhe to turant ek baar chalata hai.
export const usePolling = (fn, ms, enabled = true) => {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const tick = () => { if (!document.hidden) ref.current?.(); };
    const id = setInterval(tick, ms);
    const onVis = () => { if (!document.hidden) ref.current?.(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [ms, enabled]);
};
