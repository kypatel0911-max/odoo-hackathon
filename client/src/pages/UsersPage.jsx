import { useEffect, useState } from "react";
import { api, formatDate, ROLE_LABELS } from "../lib/api.js";
import { PageHeader } from "../components/ui/PageHeader.jsx";
import { LoadingState } from "../components/ui/Feedback.jsx";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await api("/api/users");
    setUsers(data.users);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function changeRole(id, role) {
    await api(`/api/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
    load();
  }

  return (
    <div>
      <PageHeader title="User Management" subtitle="Manage roles and procurement access" />
      {loading ? <LoadingState /> : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Change Role</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td>{u.email}</td>
                  <td>{ROLE_LABELS[u.role] || u.role}</td>
                  <td>{formatDate(u.createdAt)}</td>
                  <td>
                    <select
                      className="input-field w-auto py-1 text-xs"
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="procurement_officer">Procurement Officer</option>
                      <option value="manager">Manager</option>
                      <option value="vendor">Vendor</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
