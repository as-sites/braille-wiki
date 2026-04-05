import { useState, type FormEvent } from "react";

type ProfileSettingsProps = {
  name: string;
  email: string;
};

export function ProfileSettings({ name, email }: ProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(name);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      setMessage("New passwords do not match.");
      return;
    }

    setMessage("Profile updates are prepared. Password changes will be enabled in a later API update.");
  }

  return (
    <form className="card form-stack" onSubmit={onSave}>
      <h2>Profile</h2>

      <label>
        Name
        <input
          type="text"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
          }}
        />
      </label>

      <label>
        Email
        <input type="email" value={email} disabled />
      </label>

      <label>
        Current password
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => {
            setCurrentPassword(event.target.value);
          }}
        />
      </label>

      <label>
        New password
        <input
          type="password"
          value={newPassword}
          onChange={(event) => {
            setNewPassword(event.target.value);
          }}
        />
      </label>

      <label>
        Confirm new password
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => {
            setConfirmPassword(event.target.value);
          }}
        />
      </label>

      {message ? <p>{message}</p> : null}

      <button type="submit">Save profile</button>
    </form>
  );
}
