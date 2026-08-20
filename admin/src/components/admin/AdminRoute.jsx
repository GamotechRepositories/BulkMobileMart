import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  canAccessAdminTab,
  getFirstAllowedPath,
  getTabKeyForPath,
} from "../../utils/adminPermissions";

function AdminRoute() {
  const { adminUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-400">
        Loading...
      </div>
    );
  }

  if (!adminUser || adminUser.role !== "admin") {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  const tabKey = getTabKeyForPath(location.pathname);
  if (tabKey && !canAccessAdminTab(adminUser, tabKey)) {
    return <Navigate to={getFirstAllowedPath(adminUser)} replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
