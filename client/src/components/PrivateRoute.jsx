import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { LoadingState } from "./ui/Feedback.jsx";

export function PrivateRoute({ roles }) {
  const { user, loading, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-900">
        <LoadingState />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/" replace />;

  return <Outlet />;
}
