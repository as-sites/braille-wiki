import { useState } from "react";

import { useAuth } from "../hooks/useAuth";
import { ApiKeyManager } from "../components/settings/ApiKeyManager";
import { ProfileSettings } from "../components/settings/ProfileSettings";
import { UserManager } from "../components/settings/UserManager";

type TabKey = "profile" | "keys" | "users";

export function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("profile");

  const isAdmin = user?.role === "admin";

  return (
    <div className="page-stack">
      <section className="card">
        <h1>Settings</h1>
        <div className="tab-row">
          <button type="button" className={tab === "profile" ? "is-active" : ""} onClick={() => setTab("profile")}>
            Profile
          </button>
          <button type="button" className={tab === "keys" ? "is-active" : ""} onClick={() => setTab("keys")}>
            API keys
          </button>
          {isAdmin ? (
            <button type="button" className={tab === "users" ? "is-active" : ""} onClick={() => setTab("users")}>
              Users
            </button>
          ) : null}
        </div>
      </section>

      {tab === "profile" ? <ProfileSettings name={user?.name ?? ""} email={user?.email ?? ""} /> : null}
      {tab === "keys" ? <ApiKeyManager /> : null}
      {tab === "users" && isAdmin && user ? <UserManager currentUserId={user.id} /> : null}
    </div>
  );
}
