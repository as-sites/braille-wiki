import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { useAuth } from "../../hooks/useAuth";

const links = [
  { to: "/", label: "Dashboard" },
  { to: "/documents", label: "Documents" },
  { to: "/media", label: "Media" },
  { to: "/settings", label: "Settings" },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const crumbs = location.pathname
    .split("/")
    .filter(Boolean)
    .map((part) => part.replace(/-/g, " "));

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h1>Braille Docs</h1>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} className={({ isActive }) => (isActive ? "is-active" : "")} end>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <p>{user?.name}</p>
          <button
            type="button"
            onClick={() => {
              void logout().finally(() => {
                navigate("/login");
              });
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-header">
          <span>Admin workspace</span>
          <span>{crumbs.length > 0 ? crumbs.join(" / ") : "dashboard"}</span>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
