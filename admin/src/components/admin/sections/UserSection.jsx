import { useCallback, useEffect, useState } from "react";
import { createUser, deleteUser, getUsers, updateUser } from "../../../api/api";
import AdminAlert from "../AdminAlert";
import AdminPagination, { ADMIN_PAGE_SIZE } from "../AdminPagination";
import AdminSearchBar from "../AdminSearchBar";
import { IconEdit, IconTrash } from "../AdminIcons";
import UserEditModal from "../UserEditModal";
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

function UserSection() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: ADMIN_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = { page, limit: ADMIN_PAGE_SIZE };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const { data } = await getUsers(params);
      setUsers(data.data || []);
      setPagination(
        data.pagination || {
          page,
          limit: ADMIN_PAGE_SIZE,
          total: data.data?.length || 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load users. Login as admin to view registered dealers."
      );
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setPage(1);
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const closeModal = () => {
    setEditingUser(null);
    setShowAddUser(false);
  };

  const handleSave = async (id, payload) => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      if (id) {
        await updateUser(id, payload);
        setSuccess("User updated successfully");
      } else {
        if (!payload.password) {
          delete payload.password;
        }
        await createUser(payload);
        setSuccess("User added successfully");
      }
      closeModal();
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || (id ? "Failed to update user" : "Failed to add user"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      setError("");
      setSuccess("");
      await deleteUser(id);
      setSuccess("User deleted");
      if (editingUser?._id === id) setEditingUser(null);
      const nextPage = users.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete user");
    }
  };

  return (
    <div className="min-w-0">
      <AdminAlert
        error={error}
        success={success}
        onClear={() => {
          setError("");
          setSuccess("");
        }}
      />

      <div className={pageHeaderClass}>
        <p className="text-sm font-medium text-neutral-700">
          All users ({pagination.total})
        </p>
        <div className={pageHeaderActionsClass}>
        <button
          type="button"
          onClick={() => setShowAddUser(true)}
          className={btnPrimary}
        >
          Add User
        </button>
        </div>
      </div>

      <div className={`${adminFilterCardClass} mb-4`}>
        <AdminSearchBar
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search by name or phone number..."
        />
      </div>

      {loading ? (
        <p className="text-text-secondary">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-text-secondary">
          {error
            ? "Could not load users."
            : searchQuery.trim()
              ? "No users found for this search."
              : "No registered users yet."}
        </p>
      ) : (
        <div className={adminTableWrapperClass}>
          <table className={adminCompactTableClass}>
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[28%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[26%]" />
            </colgroup>
            <thead>
              <tr className={adminTableHeaderClass}>
                <th className={adminCompactThClass}>Name</th>
                <th className={adminCompactThClass}>Email</th>
                <th className={adminCompactThClass}>Phone</th>
                <th className={adminCompactThClass}>Joined</th>
                <th className={adminCompactThClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user._id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"
                >
                  <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>
                    <span className="block truncate">{user.name}</span>
                  </td>
                  <td className={`${adminCompactTdClass} text-neutral-600`}>
                    <span className="block truncate">{user.email}</span>
                  </td>
                  <td className={`${adminCompactTdClass} text-neutral-600`}>
                    <span className="block truncate">{user.phone}</span>
                  </td>
                  <td className={`${adminCompactTdClass} text-neutral-600`}>
                    <span className="block truncate">
                      {user.createdAt
                        ? new Date(user.createdAt).toLocaleDateString("en-IN")
                        : "—"}
                    </span>
                  </td>
                  <td className={adminCompactTdClass}>
                    <div className="flex flex-nowrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingUser(user)}
                        className={iconBtnClass}
                        title="Edit"
                        aria-label="Edit user"
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(user._id)}
                        className={iconBtnDangerClass}
                        title="Delete"
                        aria-label="Delete user"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <AdminPagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            loading={loading}
            onPageChange={setPage}
          />
        </div>
      )}

      <UserEditModal
        user={editingUser}
        isAdd={showAddUser}
        onClose={closeModal}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}

export default UserSection;
