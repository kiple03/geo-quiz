import { Link, Outlet, useLocation } from 'react-router';
import './AppShell.css';
import ErrorBoundary from './ErrorBoundary';

/** Layout shared by every screen: header (later also the user menu) and the page. */
function AppShell() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-brand">
            Geo Quiz
          </Link>
        </div>
      </header>
      <main className="app-main">
        {/* Keyed by path, so navigating away from a crashed screen clears the error. */}
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default AppShell;
