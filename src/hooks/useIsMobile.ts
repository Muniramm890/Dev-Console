// @ts-nocheck
import { useEffect, useState } from "react";

// true jab screen <= breakpoint (default 768px, theme.ts ke mobile breakpoint ke barabar)
export const useIsMobile = (breakpoint = 768) => {
  const query = `(max-width:${breakpoint}px)`;
  const get = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false);
  const [isMobile, setIsMobile] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener ? mq.addEventListener("change", onChange) : mq.addListener(onChange);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", onChange) : mq.removeListener(onChange));
  }, [query]);
  return isMobile;
};
