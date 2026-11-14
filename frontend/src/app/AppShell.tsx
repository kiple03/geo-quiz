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
        {/* location.key changes on every navigation (also to the same path, e.g. "Back
            to menu" from a crashed menu), which remounts the boundary and clears the error. */}
        <ErrorBoundary key={location.key}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default AppShell;
