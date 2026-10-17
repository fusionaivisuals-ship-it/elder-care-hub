import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** React Router keeps the scroll position between pages; start each page at the top. */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}
