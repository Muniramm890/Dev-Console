// FILE: teacher-app/src/hooks/useAutoScroll.ts
// Source: admin App.tsx -> useAutoScroll [2588-2645]
// @ts-nocheck
import { useEffect, useRef } from "react";

 // 🔴 UPGRADED: Professional Seamless Auto-Scrolling Marquee Effect
export const useAutoScroll = (dependency) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.children.length === 0) return;

    const innerWrapper = el.children[0];
    // Purana clone clean karein agar pehle se hai
    const existingClone = el.querySelector('.scroll-clone');
    if (existingClone) existingClone.remove();

    let reqId;
    let isPaused = false; // 🔴 Flag to control scroll state robustly

    const scroll = () => {
      // Sirf tabhi DOM update karo jab paused NAHI hai aur content bada hai
      if (!isPaused && innerWrapper.scrollHeight > el.clientHeight) {
        // Seamless loop ke liye content duplicate karte hain
        if (!el.querySelector('.scroll-clone')) {
          const clone = innerWrapper.cloneNode(true);
          clone.classList.add('scroll-clone');
          el.appendChild(clone);
        }

        el.scrollTop += 0.6; // Scroll speed
        
        // Jaise hi original content cross ho jaye, chup chap 0 par wapas aa jao
        if (el.scrollTop >= innerWrapper.scrollHeight) {
          el.scrollTop = 0;
        }
      }
      // Loop chalta rahega, bas paused mode me DOM update skip ho jayega
      reqId = requestAnimationFrame(scroll); 
    };

    const startTimeout = setTimeout(() => { 
      reqId = requestAnimationFrame(scroll); 
    }, 500);

    const handlePause = () => { isPaused = true; };
    const handlePlay = () => { isPaused = false; };

    el.addEventListener("mouseenter", handlePause);
    el.addEventListener("mouseleave", handlePlay);
    el.addEventListener("touchstart", handlePause, { passive: true });
    el.addEventListener("touchend", handlePlay);

    return () => {
      clearTimeout(startTimeout);
      cancelAnimationFrame(reqId);
      el.removeEventListener("mouseenter", handlePause);
      el.removeEventListener("mouseleave", handlePlay);
      el.removeEventListener("touchstart", handlePause);
      el.removeEventListener("touchend", handlePlay);
    };
  }, [dependency]);
  return ref;
};
