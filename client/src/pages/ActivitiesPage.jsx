import { useEffect, useState } from "react";
import { api, formatDateTime } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { LoadingState, EmptyState } from "../components/ui/Feedback.jsx";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState("notifications");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [act, notif] = await Promise.all([
      api("/api/activities").catch(() => ({ activities: [] })),
      api("/api/notifications"),
    ]);
    setActivities(act.activities);
    setNotifications(notif.notifications);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function markRead(id) {
    await api(`/api/notifications/${id}/read`, { method: "PATCH" });
    load();
  }

  async function markAllRead() {
    await api("/api/notifications/read-all", { method: "POST" });
    load();
  }

  return (
    <div>
      <PageHeader
        title="Activity & Notifications"
        subtitle="Audit logs, RFQ alerts, approval updates, and invoice notifications"
        actions={tab === "notifications" && (
          <button type="button" className="btn-secondary" onClick={markAllRead}>Mark all read</button>
        )}
      />

      <div className="mb-6 flex gap-2">
        <button type="button" className={tab === "notifications" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("notifications")}>
          Notifications
        </button>
        <button type="button" className={tab === "activity" ? "btn-primary" : "btn-secondary"} onClick={() => setTab("activity")}>
          Audit Logs
        </button>
      </div>

      {loading ? <LoadingState /> : tab === "notifications" ? (
        notifications.length === 0 ? (
          <EmptyState title="No notifications" description="Updates about RFQs, approvals, and invoices appear here." />
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`card flex items-start justify-between gap-3 ${!n.read ? "border-brand/30 bg-brand/5" : ""}`}
              >
                <div>
                  <p className="font-medium text-white">{n.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{n.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDateTime(n.created_at)}</p>
                </div>
                {!n.read && (
                  <button type="button" className="text-xs text-brand hover:underline" onClick={() => markRead(n.id)}>Mark read</button>
                )}
              </div>
            ))}
          </div>
        )
      ) : activities.length === 0 ? (
        <EmptyState title="No activity logs" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th></tr></thead>
            <tbody>
              {activities.map((a) => (
                <tr key={a.id}>
                  <td className="text-xs">{formatDateTime(a.created_at)}</td>
                  <td>{a.user_name || "System"}</td>
                  <td className="capitalize">{a.action.replace(/_/g, " ")}</td>
                  <td><span className="text-slate-500">{a.entity_type}</span> #{a.entity_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
