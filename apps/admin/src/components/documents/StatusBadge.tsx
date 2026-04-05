type StatusBadgeProps = {
  status: "draft" | "published" | "archived";
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label =
    status === "draft" ? "Draft" : status === "published" ? "Published" : "Archived";

  return <span className={`status-badge status-badge--${status}`}>{label}</span>;
}
