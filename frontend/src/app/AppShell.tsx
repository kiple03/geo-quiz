import { Link, Outlet } from 'react-router';
import './AppShell.css';

/** Layout shared by every screen: header (later also the user menu) and the page. */
function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand">
          Geo Quiz
        </Link>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

export default AppShell;
