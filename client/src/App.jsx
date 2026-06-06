import { Navigate, Route, Routes } from "react-router-dom";
import { PrivateRoute } from "./components/PrivateRoute.jsx";
import { Layout } from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import VendorsPage from "./pages/VendorsPage.jsx";
import RfqsPage from "./pages/RfqsPage.jsx";
import RfqCreatePage from "./pages/RfqCreatePage.jsx";
import RfqDetailPage from "./pages/RfqDetailPage.jsx";
import ComparePage from "./pages/ComparePage.jsx";
import QuotationsPage from "./pages/QuotationsPage.jsx";
import QuotationSubmitPage from "./pages/QuotationSubmitPage.jsx";
import ApprovalsPage from "./pages/ApprovalsPage.jsx";
import ApprovalDetailPage from "./pages/ApprovalDetailPage.jsx";
import PurchaseOrdersPage from "./pages/PurchaseOrdersPage.jsx";
import PoDetailPage from "./pages/PoDetailPage.jsx";
import InvoicesPage from "./pages/InvoicesPage.jsx";
import InvoiceDetailPage from "./pages/InvoiceDetailPage.jsx";
import ActivitiesPage from "./pages/ActivitiesPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import UsersPage from "./pages/UsersPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="vendors" element={<PrivateRoute roles={["admin", "procurement_officer"]} />}>
            <Route index element={<VendorsPage />} />
          </Route>
          <Route path="rfqs" element={<RfqsPage />} />
          <Route path="rfqs/new" element={<PrivateRoute roles={["admin", "procurement_officer"]} />}>
            <Route index element={<RfqCreatePage />} />
          </Route>
          <Route path="rfqs/:id" element={<RfqDetailPage />} />
          <Route path="rfqs/:id/compare" element={<PrivateRoute roles={["admin", "procurement_officer", "manager"]} />}>
            <Route index element={<ComparePage />} />
          </Route>
          <Route path="quotations" element={<PrivateRoute roles={["vendor"]} />}>
            <Route index element={<QuotationsPage />} />
          </Route>
          <Route path="quotations/submit/:rfqId" element={<PrivateRoute roles={["vendor"]} />}>
            <Route index element={<QuotationSubmitPage />} />
          </Route>
          <Route path="approvals" element={<PrivateRoute roles={["admin", "procurement_officer", "manager"]} />}>
            <Route index element={<ApprovalsPage />} />
          </Route>
          <Route path="approvals/:id" element={<PrivateRoute roles={["admin", "procurement_officer", "manager"]} />}>
            <Route index element={<ApprovalDetailPage />} />
          </Route>
          <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
          <Route path="purchase-orders/:id" element={<PoDetailPage />} />
          <Route path="invoices" element={<PrivateRoute roles={["admin", "procurement_officer", "manager"]} />}>
            <Route index element={<InvoicesPage />} />
          </Route>
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="activities" element={<PrivateRoute roles={["admin", "procurement_officer", "manager"]} />}>
            <Route index element={<ActivitiesPage />} />
          </Route>
          <Route path="reports" element={<PrivateRoute roles={["admin", "procurement_officer", "manager"]} />}>
            <Route index element={<ReportsPage />} />
          </Route>
          <Route path="users" element={<PrivateRoute roles={["admin"]} />}>
            <Route index element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
