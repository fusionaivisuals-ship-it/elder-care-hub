import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** React Router keeps the scroll position between pages; start each page at the top.
 *  Only path changes and demo switches count: ?part= and ?tab= switches scroll themselves. */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  const demo = new URLSearchParams(search).get("demo");
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, demo]);
  return null;
}
