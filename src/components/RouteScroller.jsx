import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function RouteScroller() {
  const location = useLocation();

  useLayoutEffect(() => {
    document.documentElement.classList.add('route-changing');
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    const timeout = setTimeout(() => document.documentElement.classList.remove('route-changing'), 120);
    return () => clearTimeout(timeout);
  }, [location.pathname]);

  return null;
}
