import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api, ROLE_LABELS } from "../lib/api.js";

const linkClass = ({ isActive }) =>
  `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive ? "bg-brand/20 text-brand-light" : "text-slate-400 hover:bg-surface-700 hover:text-white"
  }`;

function NavItem({ to, end, children }) {
  return (
    <NavLink to={to} className={linkClass} end={end}>
      {children}
    </NavLink>
  );
}

export function Layout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api("/api/notifications?unreadOnly=true")
      .then((d) => setUnread(d.unreadCount))
      .catch(() => {});
    const id = setInterval(() => {
      api("/api/notifications?unreadOnly=true")
        .then((d) => setUnread(d.unreadCount))
        .catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-full min-h-0 bg-surface-900">
      <aside className="flex w-64 shrink-0 flex-col border-r border-surface-700 bg-surface-950">
        <div className="border-b border-surface-700 px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-lg font-bold text-white">
              V
            </div>
            <div>
              <p className="text-sm font-bold text-white">VendorBridge</p>
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Procurement ERP</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <NavItem to="/" end>
            <span>📊</span> Dashboard
          </NavItem>

          {hasRole("admin", "procurement_officer") && (
            <NavItem to="/vendors">
              <span>🏢</span> Vendors
            </NavItem>
          )}

          <NavItem to="/rfqs">
            <span>📋</span> RFQs
          </NavItem>

          {hasRole("vendor") && (
            <NavItem to="/quotations">
              <span>💰</span> My Quotations
            </NavItem>
          )}

          {hasRole("admin", "procurement_officer", "manager") && (
            <NavItem to="/approvals">
              <span>✅</span> Approvals
            </NavItem>
          )}

          <NavItem to="/purchase-orders">
            <span>📦</span> Purchase Orders
          </NavItem>

          {!hasRole("vendor") && (
            <NavItem to="/invoices">
              <span>🧾</span> Invoices
            </NavItem>
          )}

          {hasRole("admin", "procurement_officer", "manager") && (
            <>
              <NavItem to="/reports">
                <span>📈</span> Reports
              </NavItem>
              <NavItem to="/activities">
                <span>🔔</span> Activity & Alerts
                {unread > 0 && (
                  <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </NavItem>
            </>
          )}

          {hasRole("admin") && (
            <NavItem to="/users">
              <span>👥</span> Users
            </NavItem>
          )}
        </nav>

        <div className="border-t border-surface-700 p-4">
          <div className="mb-3 rounded-lg bg-surface-800 px-3 py-2">
            <p className="truncate text-sm font-medium text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{ROLE_LABELS[user?.role] || user?.role}</p>
          </div>
          <button type="button" onClick={() => { logout(); navigate("/login"); }} className="btn-secondary w-full">
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
