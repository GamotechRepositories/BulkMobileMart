import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "../../meta";

function ScrollToTop() {
  const { pathname, search } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (isFirstRender.current) {
      isFirstRender.current = false;
    } else {
      trackPageView();
    }
  }, [pathname, search]);

  return null;
}

export default ScrollToTop;
