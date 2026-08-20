import { useCallback, useEffect, useRef, useState } from "react";
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import { getAdminTabLabels } from "../../../utils/adminPermissions";
import AdminAlert from "../AdminAlert";
import AdminUserEditModal from "../AdminUserEditModal";
import AdminPagination, { ADMIN_PAGE_SIZE } from "../AdminPagination";
import AdminSearchBar from "../AdminSearchBar";
import { IconEdit, IconTrash } from "../AdminIcons";
import {
  adminCompactTableClass,
  adminCompactTdClass,
  adminCompactThClass,
  adminFilterCardClass,
  adminTableHeaderClass,
  adminTableWrapperClass,
  btnPrimary,
  iconBtnClass,
  iconBtnDangerClass,
  pageHeaderActionsClass,
  pageHeaderClass,
} from "../adminStyles";

const SEARCH_DEBOUNCE_MS = 300;

function AdminUsersSection() {
  const { adminUser } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const fetchRequestIdRef = useRef(0);
  const skipSearchDebounceRef = useRef(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    if (skipSearchDebounceRef.current) {
      skipSearchDebounceRef.current = false;
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      const nextQuery = searchInput.trim();
      setSearchQuery((prev) => {
        if (prev === nextQuery) return prev;
        setPage(1);
        return nextQuery;
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timerId);
  }, [searchInput]);

  const fetchAdmins = useCallback(async () => {
    const requestId = ++fetchRequestIdRef.current;

    try {
      setLoading(true);
      setError("");
      const params = { page, limit: ADMIN_PAGE_SIZE };
      if (searchQuery) params.search = searchQuery;

      const { data } = await getAdminUsers(params);
      if (requestId !== fetchRequestIdRef.current) return;

      setAdmins(Array.isArray(data.data) ? data.data : []);
      setPagination(data.pagination || {
        page: 1,
        limit: ADMIN_PAGE_SIZE,
        total: 0,
        totalPages: 1,
      });
    } catch (fetchError) {
      if (requestId !== fetchRequestIdRef.current) return;
      setError(fetchError.response?.data?.message || "Failed to load admin users");
    } finally {
      if (requestId === fetchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleSave = async (adminId, payload) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (adminId) {
        await updateAdminUser(adminId, payload);
        setSuccess("Admin user updated");
      } else {
        await createAdminUser(payload);
        setSuccess("Admin user created");
      }

      setEditingAdmin(null);
      setShowAddAdmin(false);
      await fetchAdmins();
    } catch (saveError) {
      setError(saveError.response?.data?.message || "Failed to save admin user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin) => {
    const confirmed = window.confirm(`Delete admin account for ${admin.name}?`);
    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");
      await deleteAdminUser(admin._id);
      setSuccess("Admin user deleted");
      await fetchAdmins();
    } catch (deleteError) {
      setError(deleteError.response?.data?.message || "Failed to delete admin user");
    }
  };

  return (
    <div className="space-y-4">
      <div className={pageHeaderClass}>
        <div>
          <h2 className="text-xl font-bold text-neutral-900">Admin Users</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Create limited-access admin accounts and choose which sidebar tabs they can open.
          </p>
        </div>
        <div className={pageHeaderActionsClass}>
          <button type="button" className={btnPrimary} onClick={() => setShowAddAdmin(true)}>
            Add Admin User
          </button>
        </div>
      </div>

      {error ? <AdminAlert type="error" message={error} onClose={() => setError("")} /> : null}
      {success ? (
        <AdminAlert type="success" message={success} onClose={() => setSuccess("")} />
      ) : null}

      <div className={adminFilterCardClass}>
        <AdminSearchBar
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by name, email, or phone"
        />
      </div>

      <div className={adminTableWrapperClass}>
        <div className={adminTableHeaderClass}>
          <p className="text-sm font-semibold text-neutral-900">Admin Accounts</p>
          <p className="text-xs text-neutral-500">{pagination.total || 0} total</p>
        </div>

        {loading ? (
          <p className="px-4 py-8 text-sm text-neutral-500">Loading admin users...</p>
        ) : admins.length === 0 ? (
          <p className="px-4 py-8 text-sm text-neutral-500">No admin users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className={adminCompactTableClass}>
              <thead>
                <tr>
                  <th className={adminCompactThClass}>Name</th>
                  <th className={adminCompactThClass}>Email</th>
                  <th className={adminCompactThClass}>Phone</th>
                  <th className={adminCompactThClass}>Access</th>
                  <th className={adminCompactThClass}>Tabs</th>
                  <th className={adminCompactThClass}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => {
                  const isSelf = adminUser?.id === admin._id || adminUser?._id === admin._id;
                  const isLimited = admin.adminType === "limited";
                  const tabLabels = isLimited ? getAdminTabLabels(admin.adminTabs) : ["All tabs"];

                  return (
                    <tr key={admin._id}>
                      <td className={adminCompactTdClass}>{admin.name}</td>
                      <td className={adminCompactTdClass}>{admin.email || "—"}</td>
                      <td className={adminCompactTdClass}>{admin.phone || "—"}</td>
                      <td className={adminCompactTdClass}>
                        {isLimited ? "Limited" : "Super"}
                      </td>
                      <td className={adminCompactTdClass}>
                        <span className="line-clamp-2 text-xs text-neutral-600">
                          {tabLabels.join(", ")}
                        </span>
                      </td>
                      <td className={adminCompactTdClass}>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={iconBtnClass}
                            aria-label={`Edit ${admin.name}`}
                            onClick={() => setEditingAdmin(admin)}
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className={iconBtnDangerClass}
                            aria-label={`Delete ${admin.name}`}
                            disabled={isSelf}
                            onClick={() => handleDelete(admin)}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminPagination page={page} pagination={pagination} onPageChange={setPage} />

      <AdminUserEditModal
        admin={editingAdmin}
        isAdd={showAddAdmin}
        onClose={() => {
          setEditingAdmin(null);
          setShowAddAdmin(false);
        }}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

export default AdminUsersSection;
