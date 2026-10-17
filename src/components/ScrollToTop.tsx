import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { KEYS, load, save } from "@/lib/storage";

type Positions = Record<string, number>;

function isReload(): boolean {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type === "reload";
  } catch {
    return false;
  }
}

/**
 * Scroll handling:
 * - a new page (path change or demo switch) starts at the top; ?part= and ?tab= switches scroll themselves;
 * - after a browser refresh, the page returns to where the reader was (positions saved per URL in sessionStorage).
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  const demo = new URLSearchParams(search).get("demo");
  const url = pathname + search;

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  }, []);

  // remember the position for this URL
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => save("session", KEYS.scroll, { ...load<Positions>("session", KEYS.scroll, {}), [url]: Math.round(window.scrollY) }));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, [url]);

  // on first load after a refresh, restore once the (async) content is tall enough
  useEffect(() => {
    const target = isReload() ? load<Positions>("session", KEYS.scroll, {})[window.location.pathname + window.location.search] : undefined;
    if (!target) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (document.documentElement.scrollHeight - window.innerHeight >= target || tries > 40) {
        window.scrollTo(0, target);
        window.clearInterval(timer);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, []);

  // first render after a refresh is handled by the restore above; every later page change starts at the top
  const first = useRef(true);
  useEffect(() => {
    if (first.current && isReload()) {
      first.current = false;
      return;
    }
    first.current = false;
    window.scrollTo(0, 0);
  }, [pathname, demo]);
  return null;
}
