import { STATUS_COLORS } from "../../lib/api.js";

export function StatusBadge({ status }) {
  const label = String(status || "unknown").replace(/_/g, " ");
  const color = STATUS_COLORS[status] || "bg-slate-600";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize text-white ${color}`}>
      {label}
    </span>
  );
}
