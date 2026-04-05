import { Link, Outlet } from "react-router";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/documents", label: "Documents" },
  { to: "/media", label: "Media" },
  { to: "/settings", label: "Settings" },
];

export function AdminLayout() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h1>Braille Docs</h1>
        <nav>
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="admin-main">
        <header className="admin-header">Admin Workspace</header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
