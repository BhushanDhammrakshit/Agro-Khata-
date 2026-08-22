"use client";

import { useEffect, useState, RefObject } from "react";

export interface FloatingRect {
  left: number;
  width: number;
  maxHeight: number;
  /** "top" style value in px, only set when placement === "bottom" */
  top?: number;
  /** "bottom" style value in px (distance from viewport bottom), only set when placement === "top" */
  bottom?: number;
  placement: "bottom" | "top";
}

/**
 * Tracks a fixed-position dropdown's coordinates relative to an anchor element.
 * Re-measures on scroll/resize AND on `visualViewport` resize/scroll (fired by
 * iOS Safari when the on-screen keyboard opens/closes — plain `window` resize
 * does not reliably fire there), plus a couple of delayed re-measures to catch
 * the keyboard's open/close animation settling. Also clamps the dropdown so it
 * never renders off-screen or underneath the keyboard.
 */
export function useFloatingPosition(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  minWidth = 0,
  minSpace = 120,
): FloatingRect | null {
  const [rect, setRect] = useState<FloatingRect | null>(null);

  useEffect(() => {
    if (!open) {
      setRect(null);
      return;
    }

    function compute() {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vv = window.visualViewport;
      const viewportTop = vv ? vv.offsetTop : 0;
      const viewportHeight = vv ? vv.height : window.innerHeight;
      const viewportWidth = vv ? vv.width : window.innerWidth;

      const width = Math.max(r.width, minWidth);
      const left = Math.min(Math.max(r.left, 8), Math.max(8, viewportWidth - width - 8));

      const spaceBelow = viewportTop + viewportHeight - r.bottom;
      const spaceAbove = r.top - viewportTop;
      const gap = 4;

      if (spaceBelow < minSpace && spaceAbove > spaceBelow) {
        setRect({
          left,
          width,
          placement: "top",
          bottom: window.innerHeight - r.top + gap,
          maxHeight: Math.max(80, spaceAbove - gap - 8),
        });
      } else {
        setRect({
          left,
          width,
          placement: "bottom",
          top: r.bottom + gap,
          maxHeight: Math.max(80, spaceBelow - gap - 8),
        });
      }
    }

    compute();
    const raf = requestAnimationFrame(compute);
    // iOS keyboard show/hide animates over ~250-350ms; catch it settling.
    const t1 = setTimeout(compute, 120);
    const t2 = setTimeout(compute, 350);

    document.addEventListener("scroll", compute, true);
    window.addEventListener("resize", compute);
    window.visualViewport?.addEventListener("resize", compute);
    window.visualViewport?.addEventListener("scroll", compute);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      document.removeEventListener("scroll", compute, true);
      window.removeEventListener("resize", compute);
      window.visualViewport?.removeEventListener("resize", compute);
      window.visualViewport?.removeEventListener("scroll", compute);
    };
  }, [open, anchorRef, minWidth]);

  return rect;
}
